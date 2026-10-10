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

@Slf4j
@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
@Tag(name = "Predict", description = "Single-client payment-default prediction")
public class PredictController {
    private final ClassificationService classificationService;

    @PostMapping
    @Operation(summary = "Predict whether a client will default next month")
    public PredictResponse predict(@Valid @RequestBody PredictRequest request) {
        log.info("Predict request: age={}, sex={}, limit={}",
                request.getAge(), request.getSex(), request.getLimitBal());
        return classificationService.predict(request);
    }
}
