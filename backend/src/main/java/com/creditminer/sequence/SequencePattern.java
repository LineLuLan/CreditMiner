package com.creditminer.sequence;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parsed GSP pattern plus the ordered, non-contiguous subset matching semantics used for features. */
public final class SequencePattern {

    private static final Pattern ELEMENT = Pattern.compile("\\{([^}]*)}");

    private final String value;
    private final List<Set<String>> elements;
    private final int[] elementMasks;

    private SequencePattern(String value, List<Set<String>> elements, int[] elementMasks) {
        this.value = value;
        this.elements = elements;
        this.elementMasks = elementMasks;
    }

    public static SequencePattern parse(String value) {
        if (value == null || !value.startsWith("<") || !value.endsWith(">")) {
            throw new IllegalArgumentException("Invalid GSP pattern: " + value);
        }
        Matcher matcher = ELEMENT.matcher(value);
        List<Set<String>> elements = new ArrayList<>();
        while (matcher.find()) {
            Set<String> items = new LinkedHashSet<>();
            for (String item : matcher.group(1).split(",")) {
                if (!item.isBlank()) items.add(item.trim());
            }
            if (items.isEmpty()) throw new IllegalArgumentException("Empty GSP element: " + value);
            elements.add(Set.copyOf(items));
        }
        if (elements.isEmpty()) throw new IllegalArgumentException("Pattern has no elements: " + value);
        int[] masks = new int[elements.size()];
        for (int index = 0; index < elements.size(); index++) {
            int mask = 0;
            for (String item : elements.get(index)) mask |= itemBit(item);
            masks[index] = mask;
        }
        return new SequencePattern(value, List.copyOf(elements), masks);
    }

    public boolean isContainedBy(List<SequenceBuilder.SequenceElement> client) {
        int wanted = 0;
        for (SequenceBuilder.SequenceElement element : client) {
            if ((element.mask() & elementMasks[wanted]) == elementMasks[wanted]) {
                wanted++;
                if (wanted == elements.size()) return true;
            }
        }
        return false;
    }

    public String value() {
        return value;
    }

    /** Ordered subset containment; intervening elements may be skipped, itemsets stay in one month. */
    public boolean isContainedBy(SequencePattern other) {
        int wanted = 0;
        for (int mask : other.elementMasks) {
            if ((mask & elementMasks[wanted]) == elementMasks[wanted]) {
                if (++wanted == elementMasks.length) return true;
            }
        }
        return false;
    }

    public int length() {
        return elements.size();
    }

    public List<Set<String>> elements() {
        return elements;
    }

    private static int itemBit(String item) {
        return switch (item) {
            case "NO_USE" -> 1;
            case "PAID_FULL" -> 1 << 1;
            case "REVOLVING" -> 1 << 2;
            case "LATE_1" -> 1 << 3;
            case "LATE_2" -> 1 << 4;
            case "LATE_3PLUS" -> 1 << 5;
            case "NONE" -> 1 << 6;
            case "PARTIAL" -> 1 << 7;
            case "COVERED" -> 1 << 8;
            case "NO_BALANCE" -> 1 << 9;
            default -> throw new IllegalArgumentException("Unknown sequence item: " + item);
        };
    }
}
