import { YoutubeTranscript } from "youtube-transcript-plus";
import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

const CONSENT_COOKIE = "CONSENT=PENDING+987; SOCS=CAESEwgDEgk2NjIwNTc5NTQaAmVuIAEaBgiA_LyuBg";

function buildTranscriptConfig(
  base: { lang?: string }
): Parameters<typeof YoutubeTranscript.fetchTranscript>[1] {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;

  console.log("[yt] proxy:", proxy ? `yes (${proxy.replace(/:[^:@]+@/, ":***@")})` : "no");

  if (!proxy) return base;

  const dispatcher = new ProxyAgent(proxy);

  const commonFetch = async (params: {
    url: string;
    lang?: string;
    userAgent?: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }) => {
    const { url, lang, userAgent, method = "GET", body, headers = {} } = params;
    const isPlayer = url.includes("/player");
    console.log("[yt] fetch:", method, url.slice(0, 120));

    if (isPlayer && body) {
      console.log("[yt] player POST body:", body.slice(0, 1000));
    }

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...(lang && { "Accept-Language": lang }),
          ...(userAgent && { "User-Agent": userAgent }),
          ...headers,
          Cookie: CONSENT_COOKIE,
        },
        body,
        dispatcher,
      } as RequestInit & { dispatcher?: typeof dispatcher });

      const cloned = res.clone();
      const text = await cloned.text();
      const ms = Date.now() - start;
      console.log("[yt] response:", res.status, `(${ms}ms)`, "len:", text.length);

      if (isPlayer) {
        console.log("[yt] FULL player response:", text);
      } else {
        const hasCaptions = text.includes("captionTrack") || text.includes("timedtext");
        console.log("[yt] video page has captions?", hasCaptions);
        console.log("[yt] video page preview:", text.slice(0, 300));
      }

      return res;
    } catch (fetchErr) {
      console.error("[yt] fetch error:", fetchErr);
      throw fetchErr;
    }
  };

  return {
    ...base,
    videoFetch: commonFetch,
    playerFetch: commonFetch,
    transcriptFetch: commonFetch,
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
    console.log(`[yt] attempt ${attemptIdx}/${attempts.length}, lang:`, (opts as { lang?: string }).lang ?? "any");
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
        const wrapped =
          msg.includes("disabled") || msg.includes("Transcript is empty")
            ? "This video doesn't have captions available. Please try a different video."
            : `Could not fetch the transcript. ${msg}`;
        throw new Error(wrapped);
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
