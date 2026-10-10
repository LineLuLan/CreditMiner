"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getCaptionNumber,
  REPORT_CAPTION_IDS,
  type CaptionKind,
  type CaptionRegistryValue,
} from "./caption-order";

const CaptionContext = createContext<CaptionRegistryValue>(REPORT_CAPTION_IDS);

/** Open print-marked disclosure widgets before printing, then restore screen state. */
export function usePrintExpandedDetails() {
  useEffect(() => {
    const selector = "details.report-detail-print, details.report-evidence-notes, details.report-details-visual";
    const opened = new Set<HTMLDetailsElement>();
    const before = () => {
      Array.from(document.querySelectorAll<HTMLDetailsElement>(selector))
        .filter((item) => !item.open)
        .forEach((item) => {
          opened.add(item);
          item.open = true;
        });
    };
    const after = () => {
      opened.forEach((item) => (item.open = false));
      opened.clear();
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}

export function CaptionRegistry({
  children,
  registry = REPORT_CAPTION_IDS,
}: {
  children: ReactNode;
  registry?: CaptionRegistryValue;
}) {
  return <CaptionContext.Provider value={registry}>{children}</CaptionContext.Provider>;
}

export function Caption({
  kind,
  id,
  children,
}: {
  kind: CaptionKind;
  id: string;
  children: ReactNode;
}) {
  const registry = useContext(CaptionContext);
  const number = getCaptionNumber(kind, id, registry);

  return (
    <figcaption
      data-caption={kind}
      className="report-caption mt-2 text-xs leading-5 text-muted-foreground"
    >
      {number !== null ? (
        <>
          <span className="font-semibold text-foreground">
            {kind === "figure" ? "Figure" : "Table"} {number}.
          </span>{" "}
        </>
      ) : null}
      {children}
    </figcaption>
  );
}

export function ReportFigure({
  id,
  caption,
  children,
  className,
}: {
  id: string;
  caption: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("report-figure min-w-0 max-w-full break-inside-avoid", className)}>
      {children}
      <Caption kind="figure" id={id}>
        {caption}
      </Caption>
    </figure>
  );
}

export function ReportTable({
  id,
  caption,
  children,
  className,
  allowPageBreak = false,
}: {
  id: string;
  caption: ReactNode;
  children: ReactNode;
  className?: string;
  allowPageBreak?: boolean;
}) {
  return (
    <figure
      className={cn(
        "report-table min-w-0 max-w-full",
        allowPageBreak ? "report-table-long" : "break-inside-avoid",
        className,
      )}
    >
      <div className="max-w-full overflow-x-auto rounded-lg border">{children}</div>
      <Caption kind="table" id={id}>
        {caption}
      </Caption>
    </figure>
  );
}

export function ReportSection({
  id,
  title,
  children,
  takeaway,
  appendix = false,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  takeaway?: ReactNode;
  appendix?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "report-section min-w-0 max-w-full scroll-mt-20 space-y-5",
        appendix && "report-appendix-start",
        className,
      )}
    >
      <div className="report-heading border-b pb-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {takeaway ? <Takeaway>{takeaway}</Takeaway> : null}
      {children}
    </section>
  );
}

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="report-takeaway break-inside-avoid rounded-lg border-l-4 border-primary bg-accent px-4 py-3 text-sm font-medium leading-6">
      {children}
    </p>
  );
}

export function ReportDetails({
  children,
  label = "Details",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "report-details report-detail-source min-w-0 max-w-full rounded-lg border bg-card",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {label}
      </summary>
      <div className="report-details-body min-w-0 max-w-full border-t px-4 py-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

const TOC = [
  ["section-1", "1 Introduction"],
  ["section-2", "2 Executive summary"],
  ["section-3", "3 Data understanding"],
  ["section-4", "4 Data preparation"],
  ["section-5", "5 Modelling"],
  ["section-5-1", "5.1 Algorithms"],
  ["section-5-2", "5.2 Improvements"],
  ["section-5-3", "5.3 Sequence mining"],
  ["section-6", "6 Evaluation"],
  ["section-7", "7 Insights and recommendations"],
  ["section-8", "8 Limitations and next steps"],
  ["section-9", "9 Conclusions"],
  ["references", "References"],
  ["appendix-a", "Appendix A Model comparison"],
  ["appendix-b", "Appendix B Parameters"],
  ["appendix-c", "Appendix C Evidence notes"],
  ["appendix-d", "Appendix D Run commands"],
] as const;

function TocLinks() {
  return (
    <nav aria-label="Report contents" className="space-y-1 text-sm">
      {TOC.map(([href, label]) => (
        <Link
          key={href}
          href={`#${href}`}
          className={cn(
            "block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
            label.startsWith("5.") && "pl-5 text-xs",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ReportToc() {
  return (
    <>
      <aside className="report-toc sticky top-20 hidden self-start rounded-lg border bg-card p-3 lg:block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contents
        </p>
        <TocLinks />
      </aside>
      <details className="report-toc rounded-lg border bg-card p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">Report contents</summary>
        <div className="mt-3">
          <TocLinks />
        </div>
      </details>
    </>
  );
}

export function EmptyEvidence({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
