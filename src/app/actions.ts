"use server";

import { getTranscript } from "@/lib/youtube";
import { generateLesson } from "@/lib/openai";
import type { ActionResult } from "@/lib/schema";

export async function generateLessonAction(
  formData: FormData
): Promise<ActionResult> {
  const url = formData.get("url");

  if (!url || typeof url !== "string" || !url.trim()) {
    return { success: false, error: "Please enter a YouTube URL." };
  }

  const trimmed = url.trim();
  const ytPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!ytPattern.test(trimmed)) {
    return { success: false, error: "Please enter a valid YouTube URL." };
  }

  try {
    const transcript = await getTranscript(trimmed);
    const lesson = await generateLesson(transcript);
    return { success: true, data: lesson };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
