package com.creditminer.controller;

import com.creditminer.service.AnomalyService;
import com.creditminer.service.InsightService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InsightControllerTest {
    @Test
    void returnsAnEmptyInsightListAsAValidResponse() {
        InsightService service = mock(InsightService.class);
        when(service.findAll()).thenReturn(List.of());
        InsightController controller = new InsightController(service, mock(AnomalyService.class));

        assertThat(controller.insights(null)).isEmpty();
    }
}
