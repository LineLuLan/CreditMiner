package com.creditminer.dto.response;

import com.creditminer.service.RuleNaming.Condition;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RuleResponse {
    private long ruleId;
    private String lhs;
    private String rhs;
    private double support;
    private double confidence;
    private double lift;
    /** {@code "default"} or {@code "non-default"}. */
    private String category;
    private List<Condition> conditions;
    private String shortName;
    private String familyId;
    private String familyLabel;
    private Long jointCount;
    private Long lhsCount;
    private Double baseline;
    @Builder.Default
    private List<RuleResponse> familyMembers = List.of();
}
