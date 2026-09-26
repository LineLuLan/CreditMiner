import type { Insight } from "@/types/api.types";

export interface EvidenceLink {
  href: string;
  label: string;
}

export function evidenceLinks(category: Insight["category"]): EvidenceLink[] {
  switch (category) {
    case "churn":
      return [
        { href: "/eda", label: "EDA evidence" },
        { href: "/mining-report#section-5-1", label: "Classification evidence" },
      ];
    case "cluster":
      return [
        { href: "/clusters", label: "Cluster evidence" },
        { href: "/mining-report#section-5-2", label: "Report section 5.2" },
      ];
    case "risk":
      return [
        { href: "/mining-report#section-6", label: "Evaluation evidence" },
        { href: "/eda", label: "EDA evidence" },
      ];
    case "opportunity":
      return [
        { href: "/rules", label: "Rule evidence" },
        { href: "/mining-report#section-7", label: "Recommendations" },
      ];
  }
}
