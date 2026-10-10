package com.creditminer.service;

import com.creditminer.dto.request.PredictRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PredictInputBuilderTest {

    @Test
    void derivesTrainingFeaturesFromOneHandComputedClient() {
        PredictRequest request = new PredictRequest();
        request.setLimitBal(new BigDecimal("1000"));
        request.setBillAmt1(new BigDecimal("500"));
        request.setBillAmt2(new BigDecimal("1000"));
        request.setBillAmt3(new BigDecimal("-100"));
        request.setBillAmt4(BigDecimal.ZERO);
        request.setBillAmt5(new BigDecimal("200"));
        request.setBillAmt6(new BigDecimal("400"));
        request.setPayAmt1(new BigDecimal("100"));
        request.setPayAmt2(new BigDecimal("200"));
        request.setPayAmt3(BigDecimal.ZERO);
        request.setPayAmt4(new BigDecimal("50"));
        request.setPayAmt5(BigDecimal.ZERO);
        request.setPayAmt6(new BigDecimal("50"));
        request.setPay1(0);
        request.setPay2(1);
        request.setPay3(2);
        request.setPay4(-1);
        request.setPay5(-2);
        request.setPay6(0);

        PredictInputBuilder.EngineeredFeatures result =
                new PredictInputBuilder(null).engineer(request);

        assertThat(result.utilization1()).isEqualTo(0.5);
        assertThat(result.avgUtilization()).isCloseTo(1.0 / 3.0, within(1e-12));
        assertThat(result.payRatio()).isCloseTo(400.0 / 2100.0, within(1e-12));
        assertThat(result.monthsDelayed()).isEqualTo(2);
        assertThat(result.maxDelay()).isEqualTo(2);
        assertThat(result.billTrend()).isEqualTo(0.1);
        assertThat(result.riskTier()).isEqualTo("High");
    }

    private static org.assertj.core.data.Offset<Double> within(double value) {
        return org.assertj.core.data.Offset.offset(value);
    }
}
