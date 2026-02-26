"use client";

import type { LessonLevel, LessonOptions, OutputStyle } from "@/lib/schema";

const LEVELS: { value: LessonLevel; label: string; desc: string }[] = [
  { value: "A2", label: "A2", desc: "Elementary" },
  { value: "B1", label: "B1", desc: "Intermediate" },
  { value: "B2", label: "B2", desc: "Upper-intermediate" },
  { value: "C1", label: "C1", desc: "Advanced" },
];

const STYLES: { value: OutputStyle; label: string; desc: string }[] = [
  { value: "teacher", label: "Teacher-friendly", desc: "Classroom explanations" },
  { value: "exam", label: "Exam-style", desc: "Formal comprehension" },
  { value: "conversation", label: "Conversation club", desc: "Discussion-oriented" },
];

export function OptionsPanel({
  options,
  onChange,
}: {
  options: LessonOptions;
  onChange: (opts: LessonOptions) => void;
}) {
  function set<K extends keyof LessonOptions>(key: K, value: LessonOptions[K]) {
    onChange({ ...options, [key]: value });
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Level
        </p>
        <div role="group" aria-label="Level" className="flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => set("level", l.value)}
              title={l.desc}
              aria-pressed={options.level === l.value}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                options.level === l.value
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Output style
        </p>
        <div role="group" aria-label="Output style" className="flex flex-col gap-1.5 sm:flex-row">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set("style", s.value)}
              aria-pressed={options.style === s.value}
              className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all sm:text-center ${
                options.style === s.value
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              <span className="block text-xs font-semibold">{s.label}</span>
              <span className="block text-[10px] text-gray-500">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-300">
            Show answers in Gap Fill
          </p>
          <p className="text-[10px] text-gray-600">
            Hide for student worksheets
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={options.showGapFillAnswers}
          aria-label="Show answers in Gap Fill"
          onClick={() => set("showGapFillAnswers", !options.showGapFillAnswers)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            options.showGapFillAnswers ? "bg-indigo-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              options.showGapFillAnswers ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
