package com.creditminer.controller;

import com.creditminer.dto.request.PredictRequest;
import com.creditminer.dto.response.PredictResponse;
import com.creditminer.service.ClassificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code POST /api/predict} — single-customer churn prediction.
 *
 * <p>The most demo-critical endpoint. See {@code docs/BE_Handoff.md §3.10}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
@Tag(name = "Predict", description = "Single-customer churn prediction")
public class PredictController {

    private final ClassificationService classificationService;

    @PostMapping
    @Operation(summary = "Predict churn for a single customer")
    public PredictResponse predict(@Valid @RequestBody PredictRequest request) {
        log.info("Predict request: age={}, gender={}, util={}",
                request.getCustomerAge(), request.getGender(), request.getAvgUtilizationRatio());
        return classificationService.predict(request);
    }
}
