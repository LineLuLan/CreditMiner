package com.creditminer.sequence;

import weka.core.Attribute;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Computes exact cross-group supports and selects discriminative GSP candidates. */
public final class SequencePatternSelector {

    public Selection select(Instances source, double minSupport, int top) throws Exception {
        Instances data = new Instances(source);
        Attribute target = data.attribute("Default");
        if (target == null) throw new IllegalArgumentException("Default class attribute missing");
        data.setClassIndex(target.index());
        SequenceBuilder.BuildResult sequences = new SequenceBuilder().build(data);
        SequenceMiner miner = new SequenceMiner();
        SequenceMiner.MiningResult defaults = miner.mine(
                sequences.defaultGsp(), sequences.defaultClients().size(), minSupport);
        SequenceMiner.MiningResult nonDefaults = miner.mine(
                sequences.nonDefaultGsp(), sequences.nonDefaultClients().size(), minSupport);
        List<DiscriminativePattern> joined = join(
                defaults, nonDefaults, sequences.defaultClients(), sequences.nonDefaultClients());
        List<String> selected = joined.stream()
                .filter(pattern -> pattern.length() >= 2)
                .sorted(Comparator
                        .comparingDouble((DiscriminativePattern pattern) -> -Math.abs(pattern.supportDiff()))
                        .thenComparing(DiscriminativePattern::pattern))
                .limit(top)
                .map(DiscriminativePattern::pattern)
                .toList();
        return new Selection(selected, defaults.minSupportUsed(), nonDefaults.minSupportUsed());
    }

    public List<DiscriminativePattern> join(
            SequenceMiner.MiningResult defaults,
            SequenceMiner.MiningResult nonDefaults,
            List<SequenceBuilder.ClientSequence> defaultClients,
            List<SequenceBuilder.ClientSequence> nonDefaultClients) {
        if (defaultClients.isEmpty() || nonDefaultClients.isEmpty()) {
            throw new IllegalArgumentException("Both default groups must contain sequences");
        }
        Map<String, SequenceMiner.FrequentPattern> defaultByPattern = byPattern(defaults.patterns());
        Map<String, SequenceMiner.FrequentPattern> nonDefaultByPattern = byPattern(nonDefaults.patterns());
        Set<String> keys = new LinkedHashSet<>(defaultByPattern.keySet());
        keys.addAll(nonDefaultByPattern.keySet());
        List<DiscriminativePattern> patterns = new ArrayList<>(keys.size());
        for (String value : keys) {
            SequencePattern pattern = SequencePattern.parse(value);
            int defaultCount = count(pattern, defaultClients);
            int nonDefaultCount = count(pattern, nonDefaultClients);
            double supportDefault = round((double) defaultCount / defaultClients.size());
            double supportNonDefault = round((double) nonDefaultCount / nonDefaultClients.size());
            patterns.add(new DiscriminativePattern(
                    value,
                    pattern.length(),
                    defaultCount,
                    nonDefaultCount,
                    supportDefault,
                    supportNonDefault,
                    round(supportDefault - supportNonDefault),
                    round(supportDefault / Math.max(supportNonDefault, 0.0001))));
        }
        patterns.sort(Comparator
                .comparingDouble((DiscriminativePattern pattern) -> -pattern.supportDiff())
                .thenComparing(DiscriminativePattern::pattern));
        return List.copyOf(patterns);
    }

    private static int count(SequencePattern pattern, List<SequenceBuilder.ClientSequence> clients) {
        int count = 0;
        for (SequenceBuilder.ClientSequence client : clients) {
            if (pattern.isContainedBy(client.elements())) count++;
        }
        return count;
    }

    private static Map<String, SequenceMiner.FrequentPattern> byPattern(
            List<SequenceMiner.FrequentPattern> patterns) {
        Map<String, SequenceMiner.FrequentPattern> out = new LinkedHashMap<>();
        for (SequenceMiner.FrequentPattern pattern : patterns) out.put(pattern.pattern(), pattern);
        return out;
    }

    private static double round(double value) {
        return Math.round(value * 100000.0) / 100000.0;
    }

    public record DiscriminativePattern(
            String pattern,
            int length,
            int supportCountDefault,
            int supportCountNonDefault,
            double supportDefault,
            double supportNonDefault,
            double supportDiff,
            double ratio) {
    }

    public record Selection(
            List<String> patterns,
            double minSupportDefault,
            double minSupportNonDefault) {
    }
}
