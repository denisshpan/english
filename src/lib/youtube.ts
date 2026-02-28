import { YoutubeTranscript } from "youtube-transcript-plus";
import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

/**
 * Build fetch options for youtube-transcript-plus.
 * When YOUTUBE_TRANSCRIPT_PROXY is set (e.g. on Vercel), uses that proxy to
 * bypass YouTube's blocking of datacenter IPs.
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
        // Node fetch (undici) accepts dispatcher for proxy
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
  // Try English first, then fall back to any available language.
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

      // Only retry on "language not available" errors; propagate everything else immediately.
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

  // Both attempts failed — captions are entirely missing or disabled.
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
