package com.creditminer.controller;

import com.creditminer.service.SequenceService;
import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only access to the generated GSP sequence-mining evidence. */
@RestController
@RequestMapping("/api/sequences")
@RequiredArgsConstructor
@Tag(name = "Sequences", description = "GSP repayment-history patterns and feature experiment")
public class SequenceController {

    private final SequenceService service;

    @GetMapping
    @Operation(summary = "Sequence patterns and with/without feature comparison")
    public JsonNode get() {
        return service.get();
    }
}
