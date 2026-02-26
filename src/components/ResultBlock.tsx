"use client";

import { memo } from "react";
import type { Lesson, TabKey } from "@/lib/schema";

export const ResultBlock = memo(function ResultBlock({
  data,
  activeTab,
  showGapFillAnswers,
}: {
  data: Lesson;
  activeTab: TabKey;
  showGapFillAnswers: boolean;
}) {
  if (activeTab === "summary") {
    return <p className="leading-relaxed text-gray-300">{data.summary}</p>;
  }

  if (activeTab === "vocabulary") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Vocabulary list">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th scope="col" className="pb-3 pr-4 font-medium">#</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Word / Phrase</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Meaning</th>
              <th scope="col" className="pb-3 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {data.vocabulary.map((item, i) => (
              <tr key={item.word} className="border-b border-gray-800 text-gray-300">
                <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-3 pr-4 font-semibold text-indigo-400">{item.word}</td>
                <td className="py-3 pr-4">{item.meaning}</td>
                <td className="py-3 italic text-gray-400">{item.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeTab === "questions") {
    return (
      <ol className="list-decimal space-y-3 pl-5 text-gray-300">
        {data.questions.map((q, i) => (
          <li key={`question-${i}`} className="leading-relaxed">{q}</li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="list-decimal space-y-4 pl-5 text-gray-300">
      {data.gapFill.map((item, i) => (
        <li key={`gap-${i}`}>
          <p className="leading-relaxed">{item.sentenceWithBlank}</p>
          {showGapFillAnswers && (
            <p className="mt-1 text-sm text-indigo-400">
              Answer: <span className="font-semibold">{item.answer}</span>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
});
