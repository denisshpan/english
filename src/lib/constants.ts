import type { LessonLevel, OutputStyle } from "@/lib/schema";

export const LEVEL_LABEL: Record<LessonLevel, string> = {
  A2: "A2 - Elementary",
  B1: "B1 - Intermediate",
  B2: "B2 - Upper-intermediate",
  C1: "C1 - Advanced",
};

export const STYLE_LABEL: Record<OutputStyle, string> = {
  teacher: "Teacher-friendly",
  exam: "Exam-style",
  conversation: "Conversation club",
};

export const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  nl: "Dutch",
};
