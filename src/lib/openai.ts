import OpenAI from "openai";
import { LessonSchema, type Lesson, type LessonOptions } from "./schema";
import {
  buildSystemPrompt,
  buildLessonPrompt,
  buildChunkSummarizePrompt,
  buildMergeSummarizePrompt,
  buildFinalSummarizePrompt,
  buildRepairPrompt,
} from "./prompts";

const MODEL = "gpt-4o-mini";
const MAX_WORDS_BEFORE_SUMMARIZE = 4000;
const CHUNK_SIZE_WORDS = 3000;
const CHUNK_OVERLAP_WORDS = 150;
const MAX_MERGED_WORDS = 2000;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  return new OpenAI({ apiKey });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function chunkText(
  text: string,
  chunkSizeWords: number,
  overlapWords: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkSizeWords) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSizeWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start += chunkSizeWords - overlapWords;
  }
  return chunks;
}

async function callChat(
  client: OpenAI,
  systemContent: string,
  userContent: string,
  jsonMode = false
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
    temperature: jsonMode ? 0.4 : 0.3,
    max_tokens: jsonMode ? 4000 : 3000,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function summarizeTranscript(
  client: OpenAI,
  transcript: string
): Promise<string> {
  const chunks = chunkText(transcript, CHUNK_SIZE_WORDS, CHUNK_OVERLAP_WORDS);

  let condensed: string;

  if (chunks.length === 1) {
    condensed = await callChat(
      client,
      "You are a helpful assistant that summarizes text concisely.",
      buildFinalSummarizePrompt(transcript)
    );
  } else {
    const chunkSummaries = await Promise.all(
      chunks.map((chunk, i) =>
        callChat(
          client,
          "You are a helpful assistant that summarizes text concisely.",
          buildChunkSummarizePrompt(chunk, i, chunks.length)
        )
      )
    );

    const merged = chunkSummaries.join("\n\n---\n\n");
    condensed = await callChat(
      client,
      "You are a helpful assistant that synthesizes information clearly.",
      buildMergeSummarizePrompt(merged)
    );
  }

  if (countWords(condensed) > MAX_MERGED_WORDS) {
    condensed = await callChat(
      client,
      "You are a helpful assistant that summarizes text concisely.",
      buildFinalSummarizePrompt(condensed)
    );
  }

  return condensed;
}

async function requestLesson(
  client: OpenAI,
  options: LessonOptions,
  userMessage: string
): Promise<string> {
  return callChat(client, buildSystemPrompt(options), userMessage, true);
}

function parseAndValidate(raw: string): Lesson {
  const json = JSON.parse(raw);
  return LessonSchema.parse(json);
}

export async function generateLesson(
  transcript: string,
  options: LessonOptions
): Promise<Lesson> {
  const client = getClient();

  let text = transcript;
  if (countWords(text) > MAX_WORDS_BEFORE_SUMMARIZE) {
    text = await summarizeTranscript(client, text);
  }

  const firstAttempt = await requestLesson(
    client,
    options,
    buildLessonPrompt(text)
  );

  try {
    return parseAndValidate(firstAttempt);
  } catch {
    const repairAttempt = await requestLesson(
      client,
      options,
      buildRepairPrompt(firstAttempt)
    );

    try {
      return parseAndValidate(repairAttempt);
    } catch {
      throw new Error("Failed to generate a valid lesson. Please try again.");
    }
  }
}
