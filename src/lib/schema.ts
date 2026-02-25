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

export type ActionResult =
  | { success: true; data: Lesson }
  | { success: false; error: string };
