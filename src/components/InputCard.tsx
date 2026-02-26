"use client";

import { useState, useTransition } from "react";
import { generateLessonAction } from "@/app/actions";
import { DEFAULT_OPTIONS, type Lesson, type LessonOptions, type ActionResult } from "@/lib/schema";
import { isValidYouTubeUrl } from "@/lib/validation";
import { OptionsPanel } from "./OptionsPanel";
import { Spinner } from "./ui/Spinner";

export function InputCard({
  onResult,
}: {
  onResult: (data: Lesson, options: LessonOptions, detectedLang: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [options, setOptions] = useState<LessonOptions>(DEFAULT_OPTIONS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = url.trim().length > 0 && !isPending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isValidYouTubeUrl(url)) {
      setError("Please enter a valid YouTube URL (youtube.com or youtu.be).");
      return;
    }

    const formData = new FormData();
    formData.set("url", url.trim());
    formData.set("level", options.level);
    formData.set("style", options.style);
    formData.set("showGapFillAnswers", String(options.showGapFillAnswers));

    startTransition(async () => {
      const result: ActionResult = await generateLessonAction(formData);
      if (result.success) {
        onResult(result.data, result.options, result.detectedLang);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h1 className="mb-1 text-2xl font-bold text-white">
        YouTube &rarr; ESL Lesson
      </h1>
      <p className="mb-6 text-sm text-gray-400">
        Paste a YouTube link to generate a{" "}
        <span className="font-medium text-indigo-400">{options.level}</span>{" "}
        English lesson instantly.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <input
            name="url"
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-label="YouTube URL"
            aria-describedby={error ? "url-error" : undefined}
            aria-invalid={!!error}
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={isPending}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Generating&hellip;
              </span>
            ) : (
              "Generate Lesson"
            )}
          </button>
        </div>

        <OptionsPanel options={options} onChange={setOptions} />
      </form>

      {error && (
        <div
          id="url-error"
          role="alert"
          className="mt-4 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}
    </div>
  );
}
