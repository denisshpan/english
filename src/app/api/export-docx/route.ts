import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
} from "docx";
import { LessonSchema } from "@/lib/schema";
import type { Lesson, LessonOptions } from "@/lib/schema";

export const runtime = "nodejs";

const LEVEL_LABEL: Record<string, string> = {
  A2: "A2 - Elementary",
  B1: "B1 - Intermediate",
  B2: "B2 - Upper-intermediate",
  C1: "C1 - Advanced",
};

const STYLE_LABEL: Record<string, string> = {
  teacher: "Teacher-friendly",
  exam: "Exam-style",
  conversation: "Conversation club",
};

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 },
    },
  });
}

function buildVocabTable(lesson: Lesson): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["#", "Word / Phrase", "Meaning", "Example"].map(
      (label) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: label, bold: true, size: 20 })],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: "F3F4F6" },
        })
    ),
  });

  const dataRows = lesson.vocabulary.map(
    (item, i) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 20, color: "888888" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.word, bold: true, color: "4F46E5", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.meaning, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.example, italics: true, color: "555555", size: 20 })] })],
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function buildDocument(lesson: Lesson, options: LessonOptions): Document {
  const level = LEVEL_LABEL[options.level] ?? options.level;
  const style = STYLE_LABEL[options.style] ?? options.style;
  const date = new Date().toLocaleDateString();

  const children = [
    new Paragraph({
      children: [new TextRun({ text: "ESL Lesson", bold: true, size: 48 })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Level: ${level}   Style: ${style}   ${date}`, size: 20, color: "888888" }),
      ],
      spacing: { after: 320 },
    }),

    heading("Summary"),
    new Paragraph({
      children: [new TextRun({ text: lesson.summary, size: 22 })],
      spacing: { after: 240 },
    }),

    heading("Vocabulary"),
    buildVocabTable(lesson),
    new Paragraph({ text: "", spacing: { after: 240 } }),

    heading("Comprehension Questions"),
    ...lesson.questions.map(
      (q, i) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, size: 22 }),
            new TextRun({ text: q, size: 22 }),
          ],
          spacing: { after: 120 },
        })
    ),
    new Paragraph({ text: "", spacing: { after: 120 } }),

    heading("Gap Fill Exercise"),
    ...lesson.gapFill.flatMap((item, i) => {
      const rows: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, size: 22 }),
            new TextRun({ text: item.sentenceWithBlank, size: 22 }),
          ],
          spacing: { after: 60 },
        }),
      ];
      if (options.showGapFillAnswers) {
        rows.push(
          new Paragraph({
            children: [
              new TextRun({ text: "     Answer: ", size: 20, color: "888888" }),
              new TextRun({ text: item.answer, bold: true, color: "4F46E5", size: 20 }),
            ],
            spacing: { after: 120 },
          })
        );
      }
      return rows;
    }),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
        },
        children,
      },
    ],
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const parsed = LessonSchema.safeParse(b?.lesson);
  if (!parsed.success) {
    return new Response("Invalid lesson data", { status: 422 });
  }

  const options: LessonOptions = {
    level: (b?.options as LessonOptions)?.level ?? "B1",
    style: (b?.options as LessonOptions)?.style ?? "teacher",
    showGapFillAnswers: (b?.options as LessonOptions)?.showGapFillAnswers ?? true,
  };

  try {
    const doc = buildDocument(parsed.data, options);
    const buffer = await Packer.toBuffer(doc);

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
