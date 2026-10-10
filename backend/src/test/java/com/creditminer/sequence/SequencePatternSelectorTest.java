package com.creditminer.sequence;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SequencePatternSelectorTest {

    @Test
    void countsExactCrossGroupSupportWhenPatternIsBelowTheOtherMiningThreshold() {
        String pattern = "<{LATE_2,NONE}{LATE_2,NONE}>";
        SequenceMiner.MiningResult defaultMining = new SequenceMiner.MiningResult(0.5, List.of(
                new SequenceMiner.FrequentPattern(pattern, 2, 2, 1.0)));
        SequenceMiner.MiningResult nonDefaultMining = new SequenceMiner.MiningResult(0.75, List.of());
        List<SequenceBuilder.ClientSequence> defaults = List.of(
                client("d1", "LATE_2", "LATE_2"), client("d2", "LATE_2", "LATE_2"));
        List<SequenceBuilder.ClientSequence> nonDefaults = List.of(
                client("n1", "LATE_2", "LATE_2"), client("n2", "REVOLVING", "LATE_1"));

        SequencePatternSelector.DiscriminativePattern result = new SequencePatternSelector()
                .join(defaultMining, nonDefaultMining, defaults, nonDefaults)
                .get(0);

        assertEquals(1.0, result.supportDefault(), 1e-9);
        assertEquals(0.5, result.supportNonDefault(), 1e-9);
        assertEquals(0.5, result.supportDiff(), 1e-9);
        assertEquals(2.0, result.ratio(), 1e-9);
    }

    private static SequenceBuilder.ClientSequence client(String id, String first, String second) {
        return new SequenceBuilder.ClientSequence(id, id.startsWith("d"), List.of(
                new SequenceBuilder.SequenceElement(first, "NONE"),
                new SequenceBuilder.SequenceElement(second, "NONE")));
    }
}
