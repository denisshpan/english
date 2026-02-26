import { parseExportRequest, isParseError } from "@/lib/export-utils";
import { buildDocx } from "@/lib/docx-builder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseExportRequest(request);
  if (isParseError(parsed)) {
    return new Response(parsed.error, { status: parsed.status });
  }

  try {
    const buffer = await buildDocx(parsed.lesson, parsed.options);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="esl-lesson.docx"',
      },
    });
  } catch (err) {
    console.error("[/api/export-docx] DOCX generation failed:", err);
    return new Response("DOCX generation failed", { status: 500 });
  }
}
