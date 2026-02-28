import { YoutubeTranscript } from "youtube-transcript-plus";
import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

type FetchParams = {
  url: string;
  lang?: string;
  userAgent?: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

const WEB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Creates videoFetch/playerFetch/transcriptFetch that share session state
 * (cookies + visitorData) so the player API doesn't return LOGIN_REQUIRED.
 */
function makeSessionFetch(dispatcher?: ProxyAgent) {
  let sessionCookies = "";
  let visitorData = "";

  const doFetch = async (url: string, init: RequestInit & { dispatcher?: ProxyAgent }) => {
    return fetch(url, init as RequestInit);
  };

  const videoFetch = async (params: FetchParams) => {
    const { url, lang, method = "GET", body, headers = {} } = params;
    console.log("[yt] videoFetch:", url.slice(0, 100));

    const res = await doFetch(url, {
      method,
      headers: {
        "User-Agent": WEB_UA,
        ...(lang && { "Accept-Language": lang }),
        ...headers,
      },
      body,
      dispatcher,
    });

    // Capture Set-Cookie for subsequent requests
    const setCookies = res.headers.getSetCookie?.() ?? [];
    sessionCookies = setCookies.map((c) => c.split(";")[0]).join("; ");
    console.log("[yt] captured cookies:", sessionCookies.slice(0, 200));

    // Extract visitorData from HTML
    const cloned = res.clone();
    const html = await cloned.text();
    console.log("[yt] video page len:", html.length);

    const vdMatch = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
    if (vdMatch) {
      visitorData = vdMatch[1];
      console.log("[yt] extracted visitorData:", visitorData.slice(0, 50));
    } else {
      console.log("[yt] no visitorData found in page");
    }

    // Check if page has captions embedded
    const hasInitialPlayer = html.includes("ytInitialPlayerResponse");
    const hasCaptions = html.includes("captionTracks") || html.includes("timedtext");
    console.log("[yt] page has ytInitialPlayerResponse:", hasInitialPlayer, "| captions:", hasCaptions);

    return res;
  };

  const playerFetch = async (params: FetchParams) => {
    const { url, lang, method = "GET", headers = {} } = params;
    let { body } = params;

    // Rewrite client and inject visitorData
    if (body) {
      try {
        const parsed = JSON.parse(body);
        const client = parsed?.context?.client;
        if (client) {
          client.clientName = "WEB";
          client.clientVersion = "2.20260225.00.00";
          client.userAgent = WEB_UA;
          if (visitorData) client.visitorData = visitorData;
        }
        body = JSON.stringify(parsed);
        console.log("[yt] playerFetch body:", body.slice(0, 300));
      } catch { /* keep original */ }
    }

    console.log("[yt] playerFetch:", method, url.slice(0, 100));
    console.log("[yt] using cookies:", sessionCookies.slice(0, 200));

    const res = await doFetch(url, {
      method,
      headers: {
        "User-Agent": WEB_UA,
        ...(lang && { "Accept-Language": lang }),
        ...headers,
        ...(sessionCookies && { Cookie: sessionCookies }),
      },
      body,
      dispatcher,
    });

    const cloned = res.clone();
    const text = await cloned.text();
    console.log("[yt] player response:", res.status, "len:", text.length);
    console.log("[yt] player body:", text.slice(0, 2000));

    return res;
  };

  const transcriptFetch = async (params: FetchParams) => {
    const { url, lang, method = "GET", body, headers = {} } = params;
    console.log("[yt] transcriptFetch:", url.slice(0, 120));

    return doFetch(url, {
      method,
      headers: {
        "User-Agent": WEB_UA,
        ...(lang && { "Accept-Language": lang }),
        ...headers,
        ...(sessionCookies && { Cookie: sessionCookies }),
      },
      body,
      dispatcher,
    });
  };

  return { videoFetch, playerFetch, transcriptFetch };
}

function buildTranscriptConfig(
  base: { lang?: string }
): Parameters<typeof YoutubeTranscript.fetchTranscript>[1] {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;
  console.log("[yt] proxy:", proxy ? "yes" : "no");

  const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
  const { videoFetch, playerFetch, transcriptFetch } = makeSessionFetch(dispatcher);

  return {
    ...base,
    userAgent: WEB_UA,
    videoFetch,
    playerFetch,
    transcriptFetch,
  };
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  console.log("[yt] getTranscript:", url);

  const attempts = [
    buildTranscriptConfig({ lang: "en" }),
    buildTranscriptConfig({}),
  ];

  let lastError: Error | null = null;
  let attemptIdx = 0;

  for (const opts of attempts) {
    attemptIdx++;
    console.log(`[yt] attempt ${attemptIdx}/${attempts.length}`);
    try {
      const segments = await YoutubeTranscript.fetchTranscript(url, opts);
      console.log("[yt] segments:", segments?.length ?? 0);

      if (!segments || segments.length === 0) continue;

      const text = segments.map((s) => s.text).join(" ");
      if (!text.trim()) continue;

      const lang = segments[0]?.lang ?? null;
      console.log("[yt] success! lang:", lang, "chars:", text.length);
      return { text, lang };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("Unknown error fetching transcript.");
      console.error(`[yt] attempt ${attemptIdx} error:`, lastError.message);

      const msg = lastError.message;
      const isLangError =
        msg.includes("No transcripts are available in") ||
        msg.includes("not available") ||
        msg.includes("Could not retrieve");

      if (!isLangError) {
        throw new Error(
          msg.includes("disabled") || msg.includes("Transcript is empty")
            ? "This video doesn't have captions available. Please try a different video."
            : `Could not fetch the transcript. ${msg}`
        );
      }
    }
  }

  const finalMsg = lastError?.message ?? "";
  if (
    finalMsg.includes("disabled") ||
    finalMsg.includes("not available") ||
    finalMsg.includes("Could not") ||
    finalMsg.includes("No transcripts")
  ) {
    throw new Error(
      "This video doesn't have captions available. Please try a different video."
    );
  }

  throw new Error(`Could not fetch the transcript. ${finalMsg}`);
}
