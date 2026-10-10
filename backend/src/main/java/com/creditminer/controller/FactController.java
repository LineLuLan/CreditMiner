package com.creditminer.controller;

import com.creditminer.dto.response.FactResponse;
import com.creditminer.service.FactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/facts")
@RequiredArgsConstructor
@Tag(name = "Facts", description = "Versioned dataset and model evidence")
public class FactController {
    private final FactService service;

    @GetMapping
    @Operation(summary = "Traceable facts with sample sizes and confidence intervals")
    public FactResponse get() {
        return service.get();
    }
}
