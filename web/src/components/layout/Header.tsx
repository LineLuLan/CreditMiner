"use client";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
