package com.creditminer.sequence;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SequencePatternTest {

    private static final List<SequenceBuilder.SequenceElement> CLIENT = List.of(
            new SequenceBuilder.SequenceElement("REVOLVING", "NONE"),
            new SequenceBuilder.SequenceElement("LATE_1", "PARTIAL"),
            new SequenceBuilder.SequenceElement("LATE_2", "NONE"),
            new SequenceBuilder.SequenceElement("LATE_3PLUS", "COVERED"));

    @Test
    void missingPaymentDoesNotMatchPaymentItemsAndNoBalanceIsDistinct() {
        List<SequenceBuilder.SequenceElement> client = List.of(
                new SequenceBuilder.SequenceElement("LATE_2", null),
                new SequenceBuilder.SequenceElement("REVOLVING", "NO_BALANCE"));
        assertTrue(SequencePattern.parse("<{LATE_2}{NO_BALANCE}>").isContainedBy(client));
        assertFalse(SequencePattern.parse("<{LATE_2,NONE}>").isContainedBy(client));
        assertFalse(SequencePattern.parse("<{COVERED}>").isContainedBy(client));
        assertFalse(SequencePattern.parse("<{NO_BALANCE}{REVOLVING}>").isContainedBy(client));
    }

    @Test
    void matchesOrderedNonContiguousElementsWithSubsetItemsets() {
        assertTrue(SequencePattern.parse("<{REVOLVING}{LATE_2,NONE}>").isContainedBy(CLIENT));
        assertTrue(SequencePattern.parse("<{PARTIAL}{LATE_3PLUS}>").isContainedBy(CLIENT));
    }

    @Test
    void rejectsWrongOrderMissingItemsAndReusingOneElement() {
        assertFalse(SequencePattern.parse("<{LATE_2}{LATE_1}>").isContainedBy(CLIENT));
        assertFalse(SequencePattern.parse("<{LATE_1,COVERED}>").isContainedBy(CLIENT));
        assertFalse(SequencePattern.parse("<{LATE_2}{NONE}>").isContainedBy(CLIENT));
    }
}
