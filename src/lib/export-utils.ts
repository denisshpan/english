import { z } from "zod";
import { LessonSchema } from "@/lib/schema";
import { LessonOptionsSchema } from "@/lib/validation";
import type { Lesson, LessonOptions } from "@/lib/schema";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export const ExportRequestSchema = z.object({
  lesson: LessonSchema,
  options: LessonOptionsSchema,
});

export interface ParsedExportRequest {
  lesson: Lesson;
  options: LessonOptions;
}

export interface ParseExportError {
  error: string;
  status: number;
}

export function isParseError(
  val: ParsedExportRequest | ParseExportError
): val is ParseExportError {
  return "error" in val;
}

export async function parseExportRequest(
  request: Request
): Promise<ParsedExportRequest | ParseExportError> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return { error: "Request body too large", status: 413 };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON", status: 400 };
  }

  const result = ExportRequestSchema.safeParse(body);
  if (!result.success) {
    return { error: "Invalid request data", status: 422 };
  }

  return result.data;
}
