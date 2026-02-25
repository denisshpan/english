"use client";

import { useState } from "react";
import { InputCard } from "@/components/InputCard";
import { OutputTabs } from "@/components/OutputTabs";
import type { Lesson } from "@/lib/schema";

export default function Home() {
  const [lesson, setLesson] = useState<Lesson | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <InputCard onResult={setLesson} />
      {lesson && <OutputTabs data={lesson} />}
    </main>
  );
}
