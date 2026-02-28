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

const WEB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function makeFetch(dispatcher?: ProxyAgent) {
  return async (params: FetchParams) => {
    const { url, lang, userAgent, method = "GET", headers = {} } = params;
    let { body } = params;

    // Rewrite ANDROID client → WEB to avoid LOGIN_REQUIRED
    if (url.includes("/player") && body) {
      try {
        const parsed = JSON.parse(body);
        if (parsed?.context?.client?.clientName === "ANDROID") {
          parsed.context.client.clientName = "WEB";
          parsed.context.client.clientVersion = "2.20260225.00.00";
          body = JSON.stringify(parsed);
          console.log("[yt] rewrote player client: ANDROID → WEB");
        }
      } catch { /* keep original body */ }
    }

    const fetchOpts: RequestInit & { dispatcher?: ProxyAgent } = {
      method,
      headers: {
        ...(lang && { "Accept-Language": lang }),
        "User-Agent": userAgent ?? WEB_USER_AGENT,
        ...headers,
      },
      body,
    };
    if (dispatcher) fetchOpts.dispatcher = dispatcher;

    console.log("[yt] fetch:", method, url.slice(0, 120));
    const start = Date.now();

    const res = await fetch(url, fetchOpts as RequestInit);

    if (url.includes("/player")) {
      const cloned = res.clone();
      const text = await cloned.text();
      console.log("[yt] player response:", res.status, `(${Date.now() - start}ms)`, "len:", text.length);
      console.log("[yt] player body:", text.slice(0, 2000));
    } else {
      console.log("[yt] response:", res.status, `(${Date.now() - start}ms)`);
    }

    return res;
  };
}

function buildTranscriptConfig(
  base: { lang?: string }
): Parameters<typeof YoutubeTranscript.fetchTranscript>[1] {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;
  console.log("[yt] proxy:", proxy ? "yes" : "no");

  const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
  const fetchFn = makeFetch(dispatcher);

  return {
    ...base,
    userAgent: WEB_USER_AGENT,
    videoFetch: fetchFn,
    playerFetch: fetchFn,
    transcriptFetch: fetchFn,
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
