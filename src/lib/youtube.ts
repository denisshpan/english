import { YoutubeTranscript } from "youtube-transcript-plus";
import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

/**
 * When YOUTUBE_TRANSCRIPT_PROXY is set (e.g. on Vercel), routes all YouTube
 * requests through that proxy to bypass datacenter IP blocking.
 */
function buildTranscriptConfig(
  base: { lang?: string }
): Parameters<typeof YoutubeTranscript.fetchTranscript>[1] {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;
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
    return fetch(url, {
      method,
      headers: {
        ...(lang && { "Accept-Language": lang }),
        ...(userAgent && { "User-Agent": userAgent }),
        ...headers,
      },
      body,
      dispatcher,
    } as RequestInit & { dispatcher?: typeof dispatcher });
  };

  return {
    ...base,
    videoFetch: commonFetch,
    playerFetch: commonFetch,
    transcriptFetch: commonFetch,
  };
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  const attempts = [
    buildTranscriptConfig({ lang: "en" }),
    buildTranscriptConfig({}),
  ];

  let lastError: Error | null = null;

  for (const opts of attempts) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(url, opts);

      if (!segments || segments.length === 0) continue;

      const text = segments.map((s) => s.text).join(" ");
      if (!text.trim()) continue;

      const lang = segments[0]?.lang ?? null;
      return { text, lang };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("Unknown error fetching transcript.");

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
