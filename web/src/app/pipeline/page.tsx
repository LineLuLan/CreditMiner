"use client";

import Link from "next/link";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Database,
  FileText,
  GitBranch,
  Network,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const crispDmPhases = [
  {
    phase: "1",
    title: "Business understanding",
    body: "Define the mining question: which customers may churn, why, and which retention actions should be prioritized.",
    evidence: "Shown in Overview and Mining Report.",
    href: "/",
    icon: Target,
  },
  {
    phase: "2",
    title: "Data understanding",
    body: "Inspect rows, features, missing values, churn balance, distributions, and churn-by dimensions.",
    evidence: "EDA page and Mining Report dataset/class balance.",
    href: "/eda",
    icon: Search,
  },
  {
    phase: "3",
    title: "Data preparation",
    body: "Remove leakage columns, clean data, detect outliers, and create engineered features used by models.",
    evidence: "Training artifacts under backend/data/processed.",
    href: "/mining-report",
    icon: Database,
  },
  {
    phase: "4",
    title: "Modeling",
    body: "Train classification, clustering, anomaly, PCA, and Apriori association-rule models.",
    evidence: "Classification, Clusters, Rules, and Anomaly sections.",
    href: "/mining-report",
    icon: Brain,
  },
  {
    phase: "5",
    title: "Evaluation",
    body: "Compare model metrics, feature importance, silhouette scores, anomaly rate, and rule support/confidence/lift.",
    evidence: "Mining Report summarizes the evaluation evidence.",
    href: "/mining-report",
    icon: CheckCircle2,
  },
  {
    phase: "6",
    title: "Deployment",
    body: "Backend exposes trained artifacts through read-only APIs; frontend renders them as dashboards and prediction tools.",
    evidence: "Predict page and all dashboard pages consume backend APIs.",
    href: "/predict",
    icon: Sparkles,
  },
] as const;

const projectPhases = [
  {
    phase: "Phase 1",
    name: "Data understanding",
    artifacts: "phase1_raw.arff, phase1_describe.json",
    backend: "Phase1Report",
    frontend: "EDA describe, Mining Report dataset profile",
    href: "/eda",
  },
  {
    phase: "Phase 2",
    name: "Preprocessing",
    artifacts: "clean.arff, phase2_report.json, phase2_outliers.json",
    backend: "Phase2Report",
    frontend: "Anomaly review and report health",
    href: "/mining-report",
  },
  {
    phase: "Phase 3",
    name: "Feature engineering",
    artifacts: "enriched.arff, phase3_report.json",
    backend: "Phase3Report",
    frontend: "Predict inputs, model evidence, feature signals",
    href: "/predict",
  },
  {
    phase: "Phase 4",
    name: "EDA service",
    artifacts: "distribution, correlation, churn-by API views",
    backend: "EdaController, EdaService",
    frontend: "EDA page",
    href: "/eda",
  },
  {
    phase: "Phase 5",
    name: "Classification",
    artifacts: "models/*.model, phase5_comparison.csv, phase5_feature_importance.json",
    backend: "Phase5Pipeline, ClassificationService",
    frontend: "Mining Report classification, Predict page",
    href: "/predict",
  },
  {
    phase: "Phase 6",
    name: "Clustering and anomaly",
    artifacts: "phase6_clusters.json, phase6_anomalies.json, phase6_pca_2d.json, kmeans*.model",
    backend: "Phase6Pipeline, ClusteringService, AnomalyService",
    frontend: "Clusters page, PCA scatter, Mining Report anomaly",
    href: "/clusters",
  },
  {
    phase: "Phase 7",
    name: "Association rules",
    artifacts: "clean_assoc.arff, models/rules.json",
    backend: "Phase7Pipeline, AssociationService",
    frontend: "Rules page, Mining Report rule evidence",
    href: "/rules",
  },
  {
    phase: "Phase 8",
    name: "Serving and dashboard aggregation",
    artifacts: "DB rows when seeded, artifact fallback when DB rows are unavailable",
    backend: "MiningReportService, DemoDataInitializer, API controllers",
    frontend: "Mining Report, Insights, Customers, Predict",
    href: "/mining-report",
  },
] as const;

const frontendOutputs = [
  {
    title: "Consolidated train result",
    route: "/mining-report",
    body: "Shows classification metrics, feature importance, clusters, anomalies, association rules, and actionable insights from backend artifacts.",
    icon: FileText,
  },
  {
    title: "EDA result",
    route: "/eda",
    body: "Shows describe/distribution/correlation/churn-by outputs backed by dataset processing and EDA services.",
    icon: BarChart3,
  },
  {
    title: "Cluster result",
    route: "/clusters",
    body: "Shows k=3 personas, PCA-2D scatter, centroid evidence, and cluster customers.",
    icon: Network,
  },
  {
    title: "Rule mining result",
    route: "/rules",
    body: "Shows Apriori rules from models/rules.json with support, confidence, lift, and category filters.",
    icon: GitBranch,
  },
  {
    title: "Prediction result",
    route: "/predict",
    body: "Uses the trained classifier model to score a customer form and return churn probability/risk.",
    icon: Sparkles,
  },
  {
    title: "Business interpretation",
    route: "/insights",
    body: "Shows explanation and recommended actions derived from model, segment, rule, and anomaly evidence.",
    icon: ShieldAlert,
  },
] as const;

export default function PipelinePage() {
  return (
    <div>
      <Header title="Mining Pipeline" />
      <div className="space-y-4 p-4 sm:p-6">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  CRISP-DM map
                </Badge>
                <Badge variant="secondary">artifact-only train completed</Badge>
              </div>
              <CardTitle className="text-2xl">
                Where data mining phases appear in CreditMiner
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                This page maps the general data-mining lifecycle to this project, then shows where
                backend training artifacts are visible in the frontend dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <StatusTile
                label="Backend artifacts"
                value="Generated"
                body="Stored under backend/data/processed and backend/models."
              />
              <StatusTile
                label="Frontend display"
                value="Available"
                body="Rendered through backend APIs, especially /api/mining-report."
              />
              <StatusTile
                label="Main proof page"
                value="Mining Report"
                body="The cleanest single screen for teacher review."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Answer</CardTitle>
              <CardDescription>Has backend training result shown on FE?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p>
                <strong>Yes.</strong> The trained backend artifacts are already surfaced on the
                frontend. The clearest page is{" "}
                <Link href="/mining-report" className="font-semibold text-primary hover:underline">
                  Mining Report
                </Link>
                .
              </p>
              <p className="text-muted-foreground">
                FE does not read model files directly. Backend reads artifacts from{" "}
                <span className="font-mono text-foreground">backend/data/processed</span> and{" "}
                <span className="font-mono text-foreground">backend/models</span>, exposes APIs,
                then FE renders the results.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {crispDmPhases.map((phase) => (
            <PhaseCard key={phase.phase} phase={phase} />
          ))}
        </section>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project phase implementation</CardTitle>
            <CardDescription>
              Concrete backend phase outputs and where each output is visible in FE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Phase</th>
                    <th className="px-3 py-2 font-medium">Backend output</th>
                    <th className="px-3 py-2 font-medium">Artifacts</th>
                    <th className="px-3 py-2 font-medium">Shown on FE</th>
                  </tr>
                </thead>
                <tbody>
                  {projectPhases.map((phase) => (
                    <tr key={phase.phase} className="border-b last:border-b-0">
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold">{phase.phase}</p>
                        <p className="text-xs text-muted-foreground">{phase.name}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-muted-foreground">{phase.backend}</td>
                      <td className="px-3 py-3 align-top">
                        <span className="font-mono text-xs leading-5">{phase.artifacts}</span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Link
                          href={phase.href}
                          className="font-medium text-primary hover:underline"
                        >
                          {phase.frontend}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {frontendOutputs.map((output) => (
            <FrontendOutputCard key={output.route} output={output} />
          ))}
        </section>
      </div>
    </div>
  );
}

function StatusTile({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function PhaseCard({ phase }: { phase: (typeof crispDmPhases)[number] }) {
  const Icon = phase.icon;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                CRISP-DM phase {phase.phase}
              </p>
              <p className="font-semibold">{phase.title}</p>
            </div>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{phase.body}</p>
        <Link href={phase.href} className="text-sm font-medium text-primary hover:underline">
          {phase.evidence}
        </Link>
      </CardContent>
    </Card>
  );
}

function FrontendOutputCard({ output }: { output: (typeof frontendOutputs)[number] }) {
  const Icon = output.icon;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{output.title}</p>
            <Link href={output.route} className="text-xs text-primary hover:underline">
              {output.route}
            </Link>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{output.body}</p>
      </CardContent>
    </Card>
  );
}
