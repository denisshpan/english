import { z } from "zod";
import { DEFAULT_OPTIONS, type LessonOptions } from "@/lib/schema";

export const YT_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

export function isValidYouTubeUrl(url: string): boolean {
  return YT_PATTERN.test(url.trim());
}

export const LessonOptionsSchema = z.object({
  level: z.enum(["A2", "B1", "B2", "C1"]).catch(DEFAULT_OPTIONS.level),
  style: z.enum(["teacher", "exam", "conversation"]).catch(DEFAULT_OPTIONS.style),
  showGapFillAnswers: z.boolean().catch(DEFAULT_OPTIONS.showGapFillAnswers),
});

export function parseOptionsFromFormData(formData: FormData): LessonOptions {
  return LessonOptionsSchema.parse({
    level: formData.get("level"),
    style: formData.get("style"),
    showGapFillAnswers: formData.get("showGapFillAnswers") !== "false",
  });
}
