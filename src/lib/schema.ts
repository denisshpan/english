import { z } from "zod";

const VocabularyItemSchema = z.object({
  word: z.string(),
  meaning: z.string(),
  example: z.string(),
});

const GapFillItemSchema = z.object({
  sentenceWithBlank: z.string(),
  answer: z.string(),
});

export const LessonSchema = z.object({
  summary: z.string(),
  vocabulary: z.array(VocabularyItemSchema).length(12),
  questions: z.array(z.string()).length(8),
  gapFill: z.array(GapFillItemSchema).length(8),
});

export type Lesson = z.infer<typeof LessonSchema>;

export type LessonLevel = "A2" | "B1" | "B2" | "C1";
export type OutputStyle = "teacher" | "exam" | "conversation";

export interface LessonOptions {
  level: LessonLevel;
  style: OutputStyle;
  showGapFillAnswers: boolean;
}

export const DEFAULT_OPTIONS: LessonOptions = {
  level: "B1",
  style: "teacher",
  showGapFillAnswers: true,
};

export type TabKey = "summary" | "vocabulary" | "questions" | "gapFill";

export type ActionResult =
  | { success: true; data: Lesson; detectedLang: string | null; options: LessonOptions }
  | { success: false; error: string };
