"use server";

import { getTranscript } from "@/lib/youtube";
import { generateLesson } from "@/lib/openai";
import {
  DEFAULT_OPTIONS,
  type ActionResult,
  type LessonLevel,
  type LessonOptions,
  type OutputStyle,
} from "@/lib/schema";

const VALID_LEVELS: LessonLevel[] = ["A2", "B1", "B2", "C1"];
const VALID_STYLES: OutputStyle[] = ["teacher", "exam", "conversation"];

function parseOptions(formData: FormData): LessonOptions {
  const level = formData.get("level");
  const style = formData.get("style");
  const showGapFillAnswers = formData.get("showGapFillAnswers");

  return {
    level: VALID_LEVELS.includes(level as LessonLevel)
      ? (level as LessonLevel)
      : DEFAULT_OPTIONS.level,
    style: VALID_STYLES.includes(style as OutputStyle)
      ? (style as OutputStyle)
      : DEFAULT_OPTIONS.style,
    showGapFillAnswers: showGapFillAnswers !== "false",
  };
}

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

  const options = parseOptions(formData);

  try {
    const { text, lang } = await getTranscript(trimmed);
    const lesson = await generateLesson(text, options);
    return { success: true, data: lesson, detectedLang: lang, options };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
