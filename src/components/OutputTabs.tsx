"use client";

import { useState, useCallback } from "react";
import type { Lesson, LessonOptions, TabKey } from "@/lib/schema";
import { ResultBlock } from "./ResultBlock";
import { Spinner } from "./ui/Spinner";
import { CopyIcon, CheckIcon, FileIcon } from "./ui/Icons";

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "questions", label: "Questions" },
  { key: "gapFill", label: "Gap Fill" },
];

function formatForCopy(
  data: Lesson,
  tab: TabKey,
  showGapFillAnswers: boolean
): string {
  switch (tab) {
    case "summary":
      return data.summary;
    case "vocabulary":
      return data.vocabulary
        .map((v, i) => `${i + 1}. ${v.word} — ${v.meaning}\n   Example: ${v.example}`)
        .join("\n\n");
    case "questions":
      return data.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    case "gapFill":
      return data.gapFill
        .map((g, i) => {
          const line = `${i + 1}. ${g.sentenceWithBlank}`;
          return showGapFillAnswers ? `${line}\n   Answer: ${g.answer}` : line;
        })
        .join("\n\n");
  }
}

export function OutputTabs({ data, options }: { data: Lesson; options: LessonOptions }) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    const text = formatForCopy(data, activeTab, options.showGapFillAnswers);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data, activeTab, options.showGapFillAnswers]);

  const triggerExport = useCallback(
    async (endpoint: string, filename: string, setLoading: (v: boolean) => void) => {
      setLoading(true);
      setExportError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson: data, options }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Export failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Export timed out. Please try again."
            : `Failed to export ${filename}. Please try again.`;
        setExportError(message);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [data, options]
  );

  const handleExportPdf = useCallback(
    () => triggerExport("/api/export", "esl-lesson.pdf", setExportingPdf),
    [triggerExport]
  );

  const handleExportDocx = useCallback(
    () => triggerExport("/api/export-docx", "esl-lesson.docx", setExportingDocx),
    [triggerExport]
  );

  return (
    <div className="mt-8 w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav
          role="tablist"
          aria-label="Lesson sections"
          className="flex gap-1 rounded-xl border border-gray-800 bg-gray-950 p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => { setActiveTab(tab.key); setCopied(false); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            aria-label="Copy current tab content"
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            aria-label="Export as PDF"
            aria-busy={exportingPdf}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingPdf ? <Spinner className="h-3 w-3" /> : <FileIcon />}
            {exportingPdf ? "Exporting..." : "PDF"}
          </button>

          <button
            onClick={handleExportDocx}
            disabled={exportingDocx}
            aria-label="Export as DOCX"
            aria-busy={exportingDocx}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingDocx ? <Spinner className="h-3 w-3" /> : <FileIcon />}
            {exportingDocx ? "Exporting..." : "DOCX"}
          </button>
        </div>
      </div>

      {exportError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400"
        >
          <span>{exportError}</span>
          <button
            onClick={() => setExportError(null)}
            aria-label="Dismiss error"
            className="ml-3 text-red-500 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      <div
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="border-t border-gray-800 pt-5"
      >
        <ResultBlock data={data} activeTab={activeTab} showGapFillAnswers={options.showGapFillAnswers} />
      </div>
    </div>
  );
}
