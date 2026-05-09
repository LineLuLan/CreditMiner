"use client";

import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="truncate text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
