import { parseExportRequest, isParseError } from "@/lib/export-utils";
import { buildPdf } from "@/lib/pdf-builder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseExportRequest(request);
  if (isParseError(parsed)) {
    return new Response(parsed.error, { status: parsed.status });
  }

  try {
    const buffer = await buildPdf(parsed.lesson, parsed.options);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="esl-lesson.pdf"',
      },
    });
  } catch (err) {
    console.error("[/api/export] PDF generation failed:", err);
    return new Response("PDF generation failed", { status: 500 });
  }
}
