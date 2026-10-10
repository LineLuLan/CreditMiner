package com.creditminer.sequence;

import weka.associations.GeneralizedSequentialPatterns;
import weka.associations.gsp.Sequence;
import weka.core.FastVector;
import weka.core.Capabilities;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Typed access to the protected GSP result vectors exposed by Weka's package implementation. */
final class GspRunner extends GeneralizedSequentialPatterns {

    private static final Pattern NOMINAL_RESULT = Pattern.compile("^(<.*>) \\((\\d+)\\)\\s*$");

    @Override
    public Capabilities getCapabilities() {
        Capabilities capabilities = super.getCapabilities();
        // Intent: absent April payment must not become an item. Weka GSP's Element.isContainedBy
        // already rejects missing values for required items. Status: enabled and support-tested;
        // next: preserve nominal input; blockers: none; confidence: hand-counted mining test.
        capabilities.enable(Capabilities.Capability.MISSING_VALUES);
        return capabilities;
    }

    List<RawPattern> patterns() {
        List<RawPattern> out = new ArrayList<>();
        for (int groupIndex = 0; groupIndex < m_AllSequentialPatterns.size(); groupIndex++) {
            FastVector group = (FastVector) m_AllSequentialPatterns.elementAt(groupIndex);
            for (int sequenceIndex = 0; sequenceIndex < group.size(); sequenceIndex++) {
                Sequence sequence = (Sequence) group.elementAt(sequenceIndex);
                Matcher matcher = NOMINAL_RESULT.matcher(sequence.toNominalString(m_OriginalDataSet).trim());
                if (!matcher.matches()) {
                    throw new IllegalStateException("Unexpected GSP result: "
                            + sequence.toNominalString(m_OriginalDataSet));
                }
                SequencePattern parsed = SequencePattern.parse(matcher.group(1));
                out.add(new RawPattern(parsed.value(), parsed.length(), Integer.parseInt(matcher.group(2))));
            }
        }
        return out;
    }

    record RawPattern(String pattern, int length, int supportCount) {
    }
}
