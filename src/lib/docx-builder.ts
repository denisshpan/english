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
import type { Lesson, LessonOptions } from "@/lib/schema";
import { LEVEL_LABEL, STYLE_LABEL } from "@/lib/constants";

const COLOR_HEADER_BG = "F3F4F6";
const COLOR_INDEX = "888888";
const COLOR_WORD = "4F46E5";
const COLOR_ITALIC = "555555";
const COLOR_SECTION_RULE = "CCCCCC";
const COLOR_ANSWER_LABEL = "888888";
const COLOR_ANSWER = "4F46E5";

const FONT_SIZE_BODY = 22;
const FONT_SIZE_TABLE = 20;
const FONT_SIZE_META = 20;
const FONT_SIZE_TITLE = 48;

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SECTION_RULE, space: 4 },
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
              children: [new TextRun({ text: label, bold: true, size: FONT_SIZE_TABLE })],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: COLOR_HEADER_BG },
        })
    ),
  });

  const dataRows = lesson.vocabulary.map(
    (item, i) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: FONT_SIZE_TABLE, color: COLOR_INDEX })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.word, bold: true, color: COLOR_WORD, size: FONT_SIZE_TABLE })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.meaning, size: FONT_SIZE_TABLE })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.example, italics: true, color: COLOR_ITALIC, size: FONT_SIZE_TABLE })] })],
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
      children: [new TextRun({ text: "ESL Lesson", bold: true, size: FONT_SIZE_TITLE })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Level: ${level}   Style: ${style}   ${date}`, size: FONT_SIZE_META, color: COLOR_INDEX }),
      ],
      spacing: { after: 320 },
    }),

    heading("Summary"),
    new Paragraph({
      children: [new TextRun({ text: lesson.summary, size: FONT_SIZE_BODY })],
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
            new TextRun({ text: `${i + 1}.  `, bold: true, size: FONT_SIZE_BODY }),
            new TextRun({ text: q, size: FONT_SIZE_BODY }),
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
            new TextRun({ text: `${i + 1}.  `, bold: true, size: FONT_SIZE_BODY }),
            new TextRun({ text: item.sentenceWithBlank, size: FONT_SIZE_BODY }),
          ],
          spacing: { after: 60 },
        }),
      ];
      if (options.showGapFillAnswers) {
        rows.push(
          new Paragraph({
            children: [
              new TextRun({ text: "     Answer: ", size: FONT_SIZE_TABLE, color: COLOR_ANSWER_LABEL }),
              new TextRun({ text: item.answer, bold: true, color: COLOR_ANSWER, size: FONT_SIZE_TABLE }),
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

export async function buildDocx(lesson: Lesson, options: LessonOptions): Promise<Buffer> {
  const doc = buildDocument(lesson, options);
  return Packer.toBuffer(doc);
}
