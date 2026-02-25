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

  const handleCopy = useCallback(async () => {
    const text = formatForCopy(data, activeTab);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data, activeTab]);

  return (
    <div className="mt-8 w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCopied(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-200"
        >
          {copied ? (
            <>
              <CheckIcon />
              Copied
            </>
          ) : (
            <>
              <CopyIcon />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="pt-5">
        <ResultBlock data={data} activeTab={activeTab} />
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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
      width="14"
      height="14"
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
