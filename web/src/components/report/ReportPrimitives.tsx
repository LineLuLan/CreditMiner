"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getCaptionNumber,
  REPORT_CAPTION_IDS,
  type CaptionKind,
  type CaptionRegistryValue,
} from "./caption-order";

const CaptionContext = createContext<CaptionRegistryValue>(REPORT_CAPTION_IDS);

export function CaptionRegistry({ children }: { children: ReactNode }) {
  return <CaptionContext.Provider value={REPORT_CAPTION_IDS}>{children}</CaptionContext.Provider>;
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
    <figure className={cn("report-figure break-inside-avoid", className)}>
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
        "report-table",
        allowPageBreak ? "report-table-long" : "break-inside-avoid",
        className,
      )}
    >
      <div className="overflow-x-auto rounded-lg border">{children}</div>
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
        "report-section scroll-mt-20 space-y-5",
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
    <p className="report-takeaway break-inside-avoid rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm font-medium leading-6">
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
      className={cn("report-details report-detail-source rounded-lg border bg-card", className)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {label}
      </summary>
      <div className="report-details-body border-t px-4 py-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

const TOC = [
  ["section-1", "1 Executive summary"],
  ["section-2", "2 Business understanding"],
  ["section-3", "3 Data understanding"],
  ["section-4", "4 Data preparation"],
  ["section-5", "5 Modelling"],
  ["section-5-1", "5.1 Classification"],
  ["section-5-2", "5.2 Clustering"],
  ["section-5-3", "5.3 Association rules"],
  ["section-5-4", "5.4 Anomaly detection"],
  ["section-6", "6 Evaluation"],
  ["section-7", "7 Insights and recommendations"],
  ["section-8", "8 Limitations and next steps"],
  ["appendix-a", "Appendix A Model comparison"],
  ["appendix-b", "Appendix B Parameters"],
  ["appendix-c", "Appendix C Evidence notes"],
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
