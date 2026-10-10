import type { Insight } from "@/types/api.types";

export interface EvidenceLink {
  href: string;
  label: string;
}

export function evidenceLinks(category: Insight["category"]): EvidenceLink[] {
  switch (category) {
    case "driver":
      return [
        { href: "/eda", label: "EDA evidence" },
        { href: "/mining-report#section-5-1", label: "Classification evidence" },
      ];
    case "segment":
      return [
        { href: "/clusters", label: "Cluster evidence" },
        { href: "/mining-report#section-5-2", label: "Report section 5.2" },
      ];
    case "context":
      return [
        { href: "/mining-report#section-6", label: "Evaluation evidence" },
        { href: "/eda", label: "EDA evidence" },
      ];
  }
}
