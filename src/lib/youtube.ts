import { YoutubeTranscript } from "youtube-transcript-plus";
import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

function buildTranscriptConfig(
  base: { lang?: string }
): Parameters<typeof YoutubeTranscript.fetchTranscript>[1] {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;

  console.log("[transcript] proxy configured:", proxy ? `yes (${proxy.replace(/:[^:@]+@/, ":***@")})` : "no");

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
    console.log("[transcript] fetch via proxy:", method, url.slice(0, 120));
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...(lang && { "Accept-Language": lang }),
          ...(userAgent && { "User-Agent": userAgent }),
          ...headers,
        },
        body,
        dispatcher,
      } as RequestInit & { dispatcher?: typeof dispatcher });
      console.log("[transcript] response:", res.status, res.statusText, `(${Date.now() - start}ms)`);
      return res;
    } catch (fetchErr) {
      console.error("[transcript] fetch error:", fetchErr);
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
  console.log("[transcript] getTranscript called for:", url);

  const attempts = [
    buildTranscriptConfig({ lang: "en" }),
    buildTranscriptConfig({}),
  ];

  let lastError: Error | null = null;
  let attemptIdx = 0;

  for (const opts of attempts) {
    attemptIdx++;
    console.log(`[transcript] attempt ${attemptIdx}/${attempts.length}, lang:`, (opts as { lang?: string }).lang ?? "any");
    try {
      const segments = await YoutubeTranscript.fetchTranscript(url, opts);

      console.log("[transcript] segments received:", segments?.length ?? 0);

      if (!segments || segments.length === 0) {
        console.log("[transcript] no segments, trying next attempt");
        continue;
      }

      const text = segments.map((s) => s.text).join(" ");
      if (!text.trim()) {
        console.log("[transcript] segments empty text, trying next attempt");
        continue;
      }

      const lang = segments[0]?.lang ?? null;
      console.log("[transcript] success! lang:", lang, "chars:", text.length);
      return { text, lang };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("Unknown error fetching transcript.");
      console.error(`[transcript] attempt ${attemptIdx} error:`, lastError.message);
      console.error("[transcript] error stack:", lastError.stack);

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
        console.error("[transcript] non-lang error, throwing:", wrapped);
        throw new Error(wrapped);
      }

      console.log("[transcript] lang error, will retry with fallback");
    }
  }

  const finalMsg = lastError?.message ?? "";
  console.error("[transcript] all attempts failed. last error:", finalMsg);

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
