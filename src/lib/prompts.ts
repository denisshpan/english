import type { LessonOptions } from "./schema";

const JSON_SCHEMA_DESCRIPTION = `{
  "summary": "string (3-5 sentences)",
  "vocabulary": [{"word":"string","meaning":"string","example":"string"}] (exactly 12 items),
  "questions": ["string"] (exactly 8 comprehension questions),
  "gapFill": [{"sentenceWithBlank":"string","answer":"string"}] (exactly 8 sentences)
}`;

function levelDescriptor(level: LessonOptions["level"]): string {
  switch (level) {
    case "A2":
      return "A2 (elementary). Use simple, short sentences and only very common everyday vocabulary. Avoid complex grammar.";
    case "B1":
      return "B1 (intermediate). Use clear, straightforward language with some variety. Vocabulary should be practical and in common use.";
    case "B2":
      return "B2 (upper-intermediate). Use more sophisticated sentence structures and a wider academic/professional vocabulary range.";
    case "C1":
      return "C1 (advanced). Use complex sentence structures, nuanced vocabulary, idiomatic expressions, and formal academic register where appropriate.";
  }
}

function styleDescriptor(style: LessonOptions["style"]): string {
  switch (style) {
    case "teacher":
      return "Write clear, classroom-friendly explanations. Questions should check factual comprehension and be appropriate for guided classroom discussion.";
    case "exam":
      return "Write formal, exam-style content. Questions should be precise and closed, suitable for written assessment. Use objective language throughout.";
    case "conversation":
      return "Write discussion-oriented content for a conversation club. Questions should be open-ended, personal, and invite extended speaking responses. Vocabulary examples should feel natural in conversation.";
  }
}

export function buildSystemPrompt(options: LessonOptions): string {
  return `You are an expert ESL (English as a Second Language) lesson creator.
You produce structured lesson materials from video transcripts.
Target level: ${levelDescriptor(options.level)}
Style: ${styleDescriptor(options.style)}
You MUST respond with ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly match this schema:
${JSON_SCHEMA_DESCRIPTION}

Rules:
- summary: 3 to 5 sentences summarising the key ideas of the transcript.
- vocabulary: exactly 12 practical words or phrases taken from or related to the transcript. Each item has word, meaning (simple definition appropriate for the target level), and example (a new, natural sentence using the word).
- questions: exactly 8 comprehension questions about the transcript content, matching the style above.
- gapFill: exactly 8 sentences derived from the transcript where one key word is replaced with "______". The answer field contains the missing word only.`;
}

export function buildLessonPrompt(transcript: string): string {
  return `Here is the transcript:\n\n${transcript}\n\nGenerate the ESL lesson JSON now.`;
}

export function buildChunkSummarizePrompt(chunk: string, index: number, total: number): string {
  return `Summarize part ${index + 1} of ${total} of a video transcript. Capture all key ideas, facts, and examples in 200-400 words. Return ONLY the summary text.\n\n${chunk}`;
}

export function buildMergeSummarizePrompt(summaries: string): string {
  return `Below are summaries of consecutive sections of a video transcript. Combine them into a single coherent summary of 1200-2000 words, preserving all key ideas and maintaining logical flow. Return ONLY the combined summary text, no headings.\n\n${summaries}`;
}

export function buildFinalSummarizePrompt(text: string): string {
  return `Condense the following text to between 1200 and 2000 words. Keep all key ideas, examples, and important details. Return ONLY the condensed text.\n\n${text}`;
}

export function buildRepairPrompt(invalidOutput: string): string {
  return `The following output was supposed to be valid JSON matching the ESL lesson schema but it failed validation. Fix it and return ONLY valid JSON, nothing else.\n\n${invalidOutput}`;
}
