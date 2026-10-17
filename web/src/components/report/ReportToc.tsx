"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  ["section-1", "1 Introduction"],
  ["section-2", "2 Executive summary"],
  ["section-3", "3 Data understanding"],
  ["section-4", "4 Data preparation"],
  ["section-5", "5 Modelling"],
  ["section-5-1", "5.1 Algorithms"],
  ["section-5-2", "5.2 Personas (K-means)"],
  ["section-5-3", "5.3 Association rules and anomalies"],
  ["section-5-4", "5.4 Sequence mining"],
  ["section-6", "6 Evaluation"],
  ["section-7", "7 Insights and recommendations"],
  ["section-8", "8 Limitations and next steps"],
  ["section-9", "9 Conclusions"],
  ["references", "References"],
  ["appendix-b", "Appendix B Parameters"],
  ["appendix-c", "Appendix C Evidence notes"],
  ["appendix-d", "Appendix D Run commands"],
] as const;

export function ReportToc() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0][0]);

  useEffect(() => {
    const sections = SECTIONS.flatMap(([id]) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    let frame = 0;

    // Intent: retain the current heading through long sections and open details.
    // Status: complete; next: none; blockers: none; confidence: high.
    const updateActiveSection = () => {
      frame = 0;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top > 96) break;
        current = section;
      }
      if (current) setActiveId(current.id);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("toggle", scheduleUpdate, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("toggle", scheduleUpdate, true);
    };
  }, []);

  return (
    <aside className="report-toc sticky top-20 hidden max-h-[calc(100dvh-6rem)] min-w-0 self-start overflow-y-auto rounded-lg border bg-card p-3 xl:block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Contents
      </p>
      <nav aria-label="Report contents" className="space-y-1 text-sm">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeId === id ? "location" : undefined}
            className={cn(
              "block break-words rounded-md px-2 py-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              label.startsWith("5.") && "pl-5 text-xs",
              activeId === id
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
