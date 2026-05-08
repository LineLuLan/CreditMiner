package com.creditminer.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

/**
 * Phase 1 (Data Understanding) describe table — see docs/BE_Handoff.md §3.13.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DescribeResponse {
    private int totalRows;
    private int totalColumns;
    private String classColumn;
    private List<String> leakageColumnsDropped;
    private List<ColumnStats> columns;
    private Instant generatedAt;
}
