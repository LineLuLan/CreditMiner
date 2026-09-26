package com.creditminer.pipeline;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Phase5PipelineTest {

    @Test
    void downsampleEvenlyKeepsEndpointsAndNeverExceedsLimit() {
        List<Integer> source = IntStream.range(0, 251).boxed().toList();

        List<Integer> sampled = Phase5Pipeline.downsampleEvenly(source, 100);

        assertEquals(100, sampled.size());
        assertEquals(source.get(0), sampled.get(0));
        assertEquals(source.get(source.size() - 1), sampled.get(sampled.size() - 1));

        int smallestGap = Integer.MAX_VALUE;
        int largestGap = Integer.MIN_VALUE;
        for (int i = 1; i < sampled.size(); i++) {
            int gap = sampled.get(i) - sampled.get(i - 1);
            smallestGap = Math.min(smallestGap, gap);
            largestGap = Math.max(largestGap, gap);
        }
        assertTrue(largestGap - smallestGap <= 1, "sample indices should be evenly spaced");
    }

    @Test
    void downsampleEvenlyLeavesShortCurvesUnchanged() {
        List<Integer> source = List.of(0, 1, 2, 3);

        List<Integer> sampled = Phase5Pipeline.downsampleEvenly(source, 100);

        assertEquals(source, sampled);
    }

    @Test
    void sanitizeCurveDropsNonFinitePointAndKeepsValidEndpoints() {
        List<Map<String, Object>> source = List.of(
                curvePoint(0.0, 1.0, 1.0),
                curvePoint(0.4, Double.NaN, 0.5),
                curvePoint(1.0, 0.2, 0.0));

        List<Map<String, Object>> sanitized = Phase5Pipeline.sanitizeCurve(
                source, "recall", "precision", "threshold");

        assertEquals(2, sanitized.size());
        assertEquals(source.get(0), sanitized.get(0));
        assertEquals(source.get(2), sanitized.get(1));
    }

    private static Map<String, Object> curvePoint(double recall, double precision, double threshold) {
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("recall", recall);
        point.put("precision", precision);
        point.put("threshold", threshold);
        return point;
    }
}
