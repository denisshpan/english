"use server";

import { getTranscript } from "@/lib/youtube";
import { generateLesson } from "@/lib/openai";
import { type ActionResult } from "@/lib/schema";
import { isValidYouTubeUrl, parseOptionsFromFormData } from "@/lib/validation";

export async function generateLessonAction(
  formData: FormData
): Promise<ActionResult> {
  const url = formData.get("url");

  if (!url || typeof url !== "string" || !url.trim()) {
    return { success: false, error: "Please enter a YouTube URL." };
  }

  const trimmed = url.trim();
  if (!isValidYouTubeUrl(trimmed)) {
    return { success: false, error: "Please enter a valid YouTube URL." };
  }

  const options = parseOptionsFromFormData(formData);

  try {
    const { text, lang } = await getTranscript(trimmed);

    if (!text.trim()) {
      return {
        success: false,
        error: "No transcript found for this video. Try a video with captions enabled.",
      };
    }

    const lesson = await generateLesson(text, options);
    return { success: true, data: lesson, detectedLang: lang, options };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
