"use client";

import { useState, useCallback } from "react";
import type { Lesson } from "@/lib/schema";
import { ResultBlock } from "./ResultBlock";

const TABS = [
  { key: "summary" as const, label: "Summary" },
  { key: "vocabulary" as const, label: "Vocabulary" },
  { key: "questions" as const, label: "Questions" },
  { key: "gapFill" as const, label: "Gap Fill" },
];

function formatForCopy(data: Lesson, tab: (typeof TABS)[number]["key"]): string {
  switch (tab) {
    case "summary":
      return data.summary;
    case "vocabulary":
      return data.vocabulary
        .map(
          (v, i) =>
            `${i + 1}. ${v.word} — ${v.meaning}\n   Example: ${v.example}`
        )
        .join("\n\n");
    case "questions":
      return data.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    case "gapFill":
      return data.gapFill
        .map(
          (g, i) =>
            `${i + 1}. ${g.sentenceWithBlank}\n   Answer: ${g.answer}`
        )
        .join("\n\n");
  }
}

export function OutputTabs({ data }: { data: Lesson }) {
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("summary");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = formatForCopy(data, activeTab);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data, activeTab]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: data }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "esl-lesson.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [data]);

  return (
    <div className="mt-8 w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
      {/* Tab bar */}
      <div className="mb-5 flex items-center justify-between">
        <nav className="flex gap-1 rounded-xl border border-gray-800 bg-gray-950 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCopied(false);
              }}
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
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
          </button>

          {/* Export PDF button */}
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? <Spinner /> : <PdfIcon />}
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-800 pt-5">
        <ResultBlock data={data} activeTab={activeTab} />
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
