"use client";

import { useState } from "react";
import { InputCard } from "@/components/InputCard";
import { OutputTabs } from "@/components/OutputTabs";
import { type Lesson, type LessonOptions } from "@/lib/schema";
import { LANG_NAMES } from "@/lib/constants";

interface LessonState {
  lesson: Lesson;
  options: LessonOptions;
  detectedLang: string | null;
}

export default function Home() {
  const [state, setState] = useState<LessonState | null>(null);

  function handleResult(lesson: Lesson, options: LessonOptions, detectedLang: string | null) {
    setState({ lesson, options, detectedLang });
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <InputCard onResult={handleResult} />

      {state && (
        <>
          <div className="mt-4 flex w-full max-w-3xl flex-wrap items-center gap-2">
            {state.detectedLang && (
              <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400">
                Transcript:{" "}
                <span className="font-medium text-gray-300">
                  {LANG_NAMES[state.detectedLang] ?? state.detectedLang}
                </span>
              </span>
            )}
            <span className="rounded-full border border-indigo-800/50 bg-indigo-900/20 px-3 py-1 text-xs text-indigo-400">
              Level: <span className="font-medium">{state.options.level}</span>
            </span>
            <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400 capitalize">
              {state.options.style === "teacher"
                ? "Teacher-friendly"
                : state.options.style === "exam"
                ? "Exam-style"
                : "Conversation club"}
            </span>
          </div>
          <OutputTabs data={state.lesson} options={state.options} />
        </>
      )}
    </main>
  );
}
