package com.creditminer.sequence;

import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

/** Runs Weka GSP and applies the assignment's support fallback rule. */
public final class SequenceMiner {

    public MiningResult mine(Instances data, int sequenceCount, double requestedMinSupport) throws Exception {
        if (sequenceCount <= 0) throw new IllegalArgumentException("sequenceCount must be positive");
        if (!(requestedMinSupport > 0 && requestedMinSupport <= 1)) {
            throw new IllegalArgumentException("minSupport must be in (0, 1]");
        }
        List<Double> attempts = supportAttempts(requestedMinSupport);
        MiningResult latest = null;
        for (double support : attempts) {
            GspRunner runner = new GspRunner();
            runner.setDataSeqID(0);
            runner.setMinSupport(support);
            runner.buildAssociations(new Instances(data));
            List<FrequentPattern> patterns = runner.patterns().stream()
                    .map(raw -> new FrequentPattern(raw.pattern(), raw.length(), raw.supportCount(),
                            round((double) raw.supportCount() / sequenceCount)))
                    .toList();
            latest = new MiningResult(support, List.copyOf(patterns));
            if (patterns.stream().anyMatch(pattern -> pattern.length() >= 2)) return latest;
        }
        return latest;
    }

    private static List<Double> supportAttempts(double requested) {
        List<Double> attempts = new ArrayList<>();
        attempts.add(requested);
        if (requested > 0.05) attempts.add(0.05);
        if (requested > 0.02) attempts.add(0.02);
        return attempts;
    }

    private static double round(double value) {
        return Math.round(value * 100000.0) / 100000.0;
    }

    public record FrequentPattern(String pattern, int length, int supportCount, double support) {
    }

    public record MiningResult(double minSupportUsed, List<FrequentPattern> patterns) {
    }
}
