import OpenAI from "openai";
import { LessonSchema, type Lesson } from "./schema";
import {
  SYSTEM_PROMPT,
  buildLessonPrompt,
  buildSummarizePrompt,
  buildRepairPrompt,
} from "./prompts";

const MODEL = "gpt-4o-mini";
const MAX_TRANSCRIPT_WORDS = 4000;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  return new OpenAI({ apiKey });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function summarizeTranscript(
  client: OpenAI,
  transcript: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that summarizes text concisely.",
      },
      { role: "user", content: buildSummarizePrompt(transcript) },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function requestLesson(
  client: OpenAI,
  userMessage: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

function parseAndValidate(raw: string): Lesson {
  const json = JSON.parse(raw);
  return LessonSchema.parse(json);
}

export async function generateLesson(transcript: string): Promise<Lesson> {
  const client = getClient();

  let text = transcript;
  if (countWords(text) > MAX_TRANSCRIPT_WORDS) {
    text = await summarizeTranscript(client, text);
  }

  const firstAttempt = await requestLesson(client, buildLessonPrompt(text));

  try {
    return parseAndValidate(firstAttempt);
  } catch {
    const repairAttempt = await requestLesson(
      client,
      buildRepairPrompt(firstAttempt)
    );

    try {
      return parseAndValidate(repairAttempt);
    } catch {
      throw new Error(
        "Failed to generate a valid lesson. Please try again."
      );
    }
  }
}
