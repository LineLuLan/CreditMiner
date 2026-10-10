package com.creditminer.sequence;

import org.junit.jupiter.api.Test;
import weka.core.Instances;

import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class SequenceMinerTest {

    @Test
    void minesStatusOnlyElementsWithoutInventingPaymentSupport() throws Exception {
        Instances fixture = new Instances(new StringReader("""
                @relation absent-payment
                @attribute SEQ_ID {a,b}
                @attribute STATUS {LATE_2,REVOLVING}
                @attribute PAYMENT {NONE,PARTIAL,COVERED,NO_BALANCE}
                @data
                a,LATE_2,?
                a,REVOLVING,NO_BALANCE
                b,LATE_2,?
                b,REVOLVING,COVERED
                """));
        SequenceMiner.MiningResult result = new SequenceMiner().mine(fixture, 2, 0.5);
        assertEquals(2, result.patterns().stream()
                .filter(p -> p.pattern().equals("<{LATE_2}{REVOLVING}>"))
                .findFirst().orElseThrow().supportCount());
        assertEquals(1, result.patterns().stream()
                .filter(p -> p.pattern().equals("<{LATE_2}{NO_BALANCE}>"))
                .findFirst().orElseThrow().supportCount());
        assertFalse(result.patterns().stream().anyMatch(p -> p.pattern().contains("NONE")));
    }

    @Test
    void minesHandCountedFrequentSequenceFromTwentySequences() throws Exception {
        try (Reader reader = new InputStreamReader(
                getClass().getResourceAsStream("/sequence/gsp-smoke.arff"), StandardCharsets.UTF_8)) {
            Instances fixture = new Instances(reader);
            SequenceMiner.MiningResult result = new SequenceMiner().mine(fixture, 20, 0.5);

            assertFalse(result.patterns().isEmpty());
            SequenceMiner.FrequentPattern late = result.patterns().stream()
                    .filter(pattern -> pattern.pattern().equals("<{LATE_2,NONE}{LATE_2,NONE}>"))
                    .findFirst()
                    .orElseThrow();
            assertEquals(12, late.supportCount());
            assertEquals(0.6, late.support(), 1e-9);
        }
    }
}
