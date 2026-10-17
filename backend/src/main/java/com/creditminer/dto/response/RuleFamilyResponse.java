package com.creditminer.dto.response;

import com.creditminer.service.RuleService.Baseline;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RuleFamilyResponse {
    private Baseline baseline;
    private List<Family> families;
    private List<Group> groups;
    /** Composite rules without an artifact singleton remain visible without invented uplift. */
    private List<RuleResponse> ungroupedRules;

    @Data
    @Builder
    public static class Family {
        private String familyId;
        private String label;
        private String attribute;
        private String attributeLabel;
        private RuleResponse baseRule;
        /** Includes every modifier and the base rule when one is available. */
        private int memberCount;
        private List<Modifier> modifiers;
    }

    @Data
    @Builder
    public static class Modifier {
        private long ruleId;
        private String label;
        private String conditionText;
        private double confidence;
        private double lift;
        private double support;
        private Long jointCount;
        private Long lhsCount;
        /** Null when the artifact contains no singleton base for comparison. */
        private Double upliftPp;
    }

    @Data
    @Builder
    public static class Group {
        private String attribute;
        private String attributeLabel;
        private List<String> familyIds;
    }
}
