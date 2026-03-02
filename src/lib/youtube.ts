import { YoutubeTranscript } from "youtube-transcript-plus";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  const attempts = [{ lang: "en" }, {}];

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
