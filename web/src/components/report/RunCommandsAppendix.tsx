"use client";

import { ReportDetails, ReportSection } from "./ReportPrimitives";

export const MAVEN_PHASE_COMMANDS = [
  {
    description: "Step 1 (Phase 1) - load and profile the source data; write the data-understanding evidence.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase1Report",
  },
  {
    description: "Step 2 (Phase 2) - clean the data and write the outlier and cleaning evidence.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase2Report",
  },
  {
    description: "Step 3 (Phase 3) - engineer features and write the derived-feature evidence.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase3Report",
  },
  {
    description: "Step 4 (Phase 5) - classify: train and evaluate the classification variants.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase5Pipeline",
  },
  {
    description: "Step 5 (Phase 6) - cluster clients into personas and detect anomalies; write PCA outputs.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase6Pipeline",
  },
  {
    description: "Step 6 (Phase 7) - mine the default and non-default association rules.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase7Pipeline",
  },
  {
    description: "After Step 6 (Phase 9) - assemble insight-report facts from Steps 1-6; this is a supporting task.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.InsightFactsReport",
  },
  {
    description: "Step 7 (Phase 10) - mine repayment sequences and evaluate sequence features.",
    command: "mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase10Pipeline",
  },
] as const;

export const CLI_COMMANDS = `java -jar target/creditminer-cli.jar preprocess --input <csv> --out <dir>
java -jar target/creditminer-cli.jar train --train <arff> [--test <arff>] --out <dir> [--algo ALL|DECISIONTREE|RANDOMFOREST|NAIVEBAYES|LOGISTIC] [--variant all|baseline|smote|cost] [--folds 10] [--seed 42]
java -jar target/creditminer-cli.jar predict --model <file> --test <arff> [--out predictions.csv]
java -jar target/creditminer-cli.jar evaluate --model <file> --test <arff>
java -jar target/creditminer-cli.jar sequence --input <arff> --train <arff> --test <arff> --out <dir> [--min-support 0.10] [--top 10]`;

export const WEB_COMMANDS = `corepack pnpm install
corepack pnpm build
NEXT_PUBLIC_API_URL=http://localhost:8091/api corepack pnpm start -p 3001`;

export const BACKEND_DEMO_COMMAND =
  "SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8091 mvn -q spring-boot:run";

export function RunCommandsAppendix({ id = "appendix-d", title = "Appendix D Run commands", collapsed = false }: { id?: string; title?: string; collapsed?: boolean }) {
  const commands = (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Steps 1-7 match the Methodology page; parentheses map the legacy phase names to those steps.
        Run the Maven main classes, CLI, and demo backend from <code>backend/</code>. Run the web
        commands from <code>web/</code>. Paths can be absolute or relative to those working
        directories.
      </p>
      <section className="space-y-3">
        <h3 className="font-semibold">Methodology steps and Maven commands</h3>
        {MAVEN_PHASE_COMMANDS.map(({ description, command }) => (
          <div key={command} className="space-y-1 break-inside-avoid">
            <p className="text-sm text-muted-foreground">{description}</p>
            <CommandBlock>{command}</CommandBlock>
          </div>
        ))}
      </section>
      <CommandSection
        title="CLI JAR"
        description="Run the packaged CLI commands after building target/creditminer-cli.jar."
        commands={CLI_COMMANDS}
      />
      <CommandSection
        title="Web application"
        description="Install, build, and serve the report on port 3001 against the demo backend."
        commands={WEB_COMMANDS}
      />
      <CommandSection
        title="Demo backend"
        description="Start the Spring Boot demo profile on port 8091."
        commands={BACKEND_DEMO_COMMAND}
      />
    </div>
  );
  return <ReportSection id={id} title={title} appendix>{collapsed ? <ReportDetails label="Show run commands" className="report-detail-print">{commands}</ReportDetails> : commands}</ReportSection>;
}

function CommandSection({
  title,
  description,
  commands,
}: {
  title: string;
  description: string;
  commands: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <CommandBlock>{commands}</CommandBlock>
    </section>
  );
}

function CommandBlock({ children }: { children: string }) {
  return (
    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-4 text-xs leading-5">
      <code>{children}</code>
    </pre>
  );
}
