"use client";

import { useState, useTransition } from "react";
import { generateLessonAction } from "@/app/actions";
import type { Lesson, ActionResult } from "@/lib/schema";

function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(
    url.trim()
  );
}

export function InputCard({
  onResult,
}: {
  onResult: (data: Lesson) => void;
}) {
  const [url, setUrl] = useState("");
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

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result: ActionResult = await generateLessonAction(formData);
      if (result.success) {
        onResult(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h1 className="mb-1 text-2xl font-bold text-white">
        YouTube → ESL Lesson
      </h1>
      <p className="mb-6 text-sm text-gray-400">
        Paste a YouTube link to generate a B1–B2 English lesson instantly.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
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
          className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Generating…
            </span>
          ) : (
            "Generate Lesson"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
