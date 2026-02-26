import { YoutubeTranscript } from "youtube-transcript-plus";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url, {
      lang: "en",
    });

    if (!segments || segments.length === 0) {
      throw new Error("Transcript is empty.");
    }

    const text = segments.map((s) => s.text).join(" ");

    if (!text.trim()) {
      throw new Error("Transcript is empty.");
    }

    const lang = segments[0]?.lang ?? null;

    return { text, lang };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching transcript.";

    if (
      message.includes("disabled") ||
      message.includes("not available") ||
      message.includes("Could not") ||
      message.includes("Transcript is empty")
    ) {
      throw new Error(
        "This video doesn't have English captions available. Please try a different video."
      );
    }

    throw new Error(`Could not fetch the transcript. ${message}`);
  }
}
