package com.creditminer.pipeline;

import lombok.extern.slf4j.Slf4j;

/** Runs every artifact-producing phase in dependency order without touching a database. */
@Slf4j
public class TrainPipeline {

    public static void main(String[] args) throws Exception {
        log.info("Starting complete CreditMiner artifact pipeline");
        Phase1Report.main(new String[0]);
        Phase2Report.main(new String[0]);
        Phase3Report.main(new String[0]);
        Phase5Pipeline.main(new String[0]);
        Phase6Pipeline.main(new String[0]);
        Phase7Pipeline.main(new String[0]);
        InsightFactsReport.main(new String[0]);
        log.info("CreditMiner artifact pipeline complete");
    }
}
