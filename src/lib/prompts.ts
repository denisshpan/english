const JSON_SCHEMA_DESCRIPTION = `{
  "summary": "string (3-5 sentences)",
  "vocabulary": [{"word":"string","meaning":"string","example":"string"}] (exactly 12 items),
  "questions": ["string"] (exactly 8 comprehension questions),
  "gapFill": [{"sentenceWithBlank":"string","answer":"string"}] (exactly 8 sentences)
}`;

export const SYSTEM_PROMPT = `You are an expert ESL (English as a Second Language) lesson creator.
You produce structured lesson materials from video transcripts.
Target level: B1–B2 (intermediate).
You MUST respond with ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly match this schema:
${JSON_SCHEMA_DESCRIPTION}

Rules:
- summary: 3 to 5 sentences summarising the key ideas of the transcript.
- vocabulary: exactly 12 practical words or phrases taken from or related to the transcript. Each item has word, meaning (simple definition), and example (a new sentence using the word).
- questions: exactly 8 comprehension questions about the transcript content.
- gapFill: exactly 8 sentences derived from the transcript where one key word is replaced with "______". The answer field contains the missing word.`;

export function buildLessonPrompt(transcript: string): string {
  return `Here is the transcript:\n\n${transcript}\n\nGenerate the ESL lesson JSON now.`;
}

export function buildSummarizePrompt(transcript: string): string {
  return `Summarize the following transcript to between 1200 and 2000 words. Keep all key ideas, examples, and important details. Return ONLY the summary text, no JSON, no markdown.\n\n${transcript}`;
}

export function buildRepairPrompt(invalidOutput: string): string {
  return `The following output was supposed to be valid JSON matching the ESL lesson schema but it failed validation. Fix it and return ONLY valid JSON, nothing else.\n\n${invalidOutput}`;
}
