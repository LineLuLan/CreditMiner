package com.creditminer.service;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import java.util.ArrayList;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class AssociationServiceTest {
    @Test
    void fixedBinsRespectEdges() {
        long[] q = {50000, 140000, 240000};
        assertThat(AssociationService.bin("LIMIT_BAL", 50000, q)).isEqualTo("<=50000");
        assertThat(AssociationService.bin("LIMIT_BAL", 50001, q)).isEqualTo("50001-140000");
        assertThat(AssociationService.bin("LIMIT_BAL", 240001, q)).isEqualTo(">240000");
        assertThat(AssociationService.bin("AVG_UTILIZATION", 0, q)).isEqualTo("<=0%");
        assertThat(AssociationService.bin("AVG_UTILIZATION", .25, q)).isEqualTo("0-25%");
        assertThat(AssociationService.bin("AVG_UTILIZATION", .5, q)).isEqualTo("25-50%");
        assertThat(AssociationService.bin("AVG_UTILIZATION", 1, q)).isEqualTo("50-100%");
        assertThat(AssociationService.bin("PAY_RATIO", 0, q)).isEqualTo("0%");
        assertThat(AssociationService.bin("PAY_RATIO", .1, q)).isEqualTo("0-10%");
        assertThat(AssociationService.bin("PAY_RATIO", .5, q)).isEqualTo("10-50%");
        assertThat(AssociationService.bin("PAY_RATIO", 1, q)).isEqualTo(">=100%");
        assertThat(AssociationService.bin("PAY_RATIO", Double.NaN, q)).isEqualTo("n/a");
        assertThat(AssociationService.bin("AGE", 29, q)).isEqualTo("<=29");
        assertThat(AssociationService.bin("AGE", 30, q)).isEqualTo("30-39");
        assertThat(AssociationService.bin("AGE", 60, q)).isEqualTo(">=60");
        assertThat(AssociationService.bin("PAY_1", -2, q)).isEqualTo("-2");
        assertThat(AssociationService.bin("MAX_DELAY", -1, q)).isEqualTo("<=0");
        assertThat(AssociationService.bin("MONTHS_DELAYED", 6, q)).isEqualTo("3+");
    }

    @Test
    void pruningUsesExactCoverageConfidenceGainAndFamiliesOn200Rows() {
        Instances data = synthetic();
        var service = new AssociationService();
        List<AssociationService.RuleRecord> candidates = List.of(
                service.measure(data, "PAY_1=2", "Yes"),
                service.measure(data, "PAY_1=2, AGE=30-39", "Yes"),
                service.measure(data, "PAY_1=2, SEX=Female", "Yes"),
                service.measure(data, "PAY_1=2, EDUCATION=Graduate", "Yes"),
                service.measure(data, "PAY_1=2, MARRIAGE=Single", "Yes"));
        var result = service.prune(data, candidates);
        assertThat(result.counts()).containsEntry("beforePruning", 5)
                .containsEntry("afterCoverage", 4).containsEntry("afterConfidenceGain", 3)
                .containsEntry("afterFamily", 1).containsEntry("afterLimit", 1);
        assertThat(result.rules().get(0).lhs()).isEqualTo("PAY_1=2");
        assertThat(result.rules().get(0).jointCount()).isEqualTo(60);
        assertThat(result.rules().get(0).lhsCount()).isEqualTo(100);
        assertThat(result.familyMembers()).extracting(AssociationService.RuleRecord::lhs)
                .containsExactly("PAY_1=2, EDUCATION=Graduate", "PAY_1=2, MARRIAGE=Single");
    }

    @Test
    void equalLengthFamilyRepresentativesUseLiftThenSupport() {
        var service = new AssociationService();
        var data = synthetic();
        var highLift = service.measure(data, "PAY_1=2, EDUCATION=Graduate", "Yes");
        var lowerLift = service.measure(data, "PAY_1=2, MARRIAGE=Single", "Yes");
        assertThat(service.prune(data, List.of(lowerLift, highLift)).rules()).containsExactly(highLift);

        for (int i = 0; i < data.numInstances(); i++)
            data.instance(i).setValue(data.attribute("MARRIAGE"), i < 50 || i >= 150 ? "Single" : "Married");
        var higherSupport = service.measure(data, "PAY_1=2, MARRIAGE=Single", "Yes");
        assertThat(higherSupport.lift()).isEqualTo(highLift.lift());
        assertThat(higherSupport.support()).isGreaterThan(highLift.support());
        assertThat(service.prune(data, List.of(highLift, higherSupport)).rules()).containsExactly(higherSupport);
    }

    @Test
    void minesOnlyAllowedViewsAndExactConsequents() throws Exception {
        var service = new AssociationService();
        var data = synthetic();
        var rules = service.findDefaultRules(data, AssociationService.DEFAULT_SUPPORT_STEPS).rules();
        assertThat(rules).isNotEmpty().allSatisfy(r -> {
            assertThat(r.rhs()).isEqualTo("Default=Yes");
            assertThat(r.confidence()).isGreaterThanOrEqualTo(.30);
            assertThat(r.lift()).isGreaterThanOrEqualTo(1.25);
            assertThat(r.lhs().split(", ")).hasSizeLessThanOrEqualTo(2);
        });
        assertThat(service.familyMembers("default", rules)).isNotEmpty();
        assertThat(service.familyMembers("default", List.of())).isEmpty();
        assertThat(service.findNonDefaultRules(data)).isNotEmpty().allSatisfy(r -> {
            assertThat(r.rhs()).isEqualTo("Default=No");
            assertThat(r.confidence()).isGreaterThanOrEqualTo(.85);
            assertThat(r.lift()).isGreaterThanOrEqualTo(1.08);
        });
    }

    @Test
    void aprioriInputIsNominalWithExactClassLastAndFallbackMatchesCounting() throws Exception {
        var service = new AssociationService();
        var subset = AssociationService.selectAttributes(synthetic(), List.of("PAY_1", "SEX"));
        assertThat(subset.classIndex()).isEqualTo(subset.numAttributes() - 1);
        assertThat(subset.classAttribute().name()).isEqualTo("Default");
        assertThat(java.util.Collections.list(subset.classAttribute().enumerateValues())).containsExactly("No", "Yes");
        for (int i = 0; i < subset.numAttributes(); i++) assertThat(subset.attribute(i).isNominal()).isTrue();
        var exact = service.enumerateRules(subset, List.of("PAY_1", "SEX"), "Yes", .01, .3, 1.25);
        assertThat(exact).anySatisfy(rule -> {
            assertThat(rule.lhs()).isEqualTo("PAY_1=2");
            assertThat(rule.jointCount()).isEqualTo(60);
            assertThat(rule.lhsCount()).isEqualTo(100);
            assertThat(rule.support()).isEqualTo(.3);
            assertThat(rule.confidence()).isEqualTo(.6);
            assertThat(rule.lift()).isEqualTo(2);
        });
    }

    @Test
    void preparesReadableBinsAndExcludesDerivedAndUndefinedItems() {
        var attrs = new ArrayList<Attribute>();
        for (String name : List.of("ID", "LIMIT_BAL", "PAY_1", "RISK_TIER", "PAY_RATIO")) attrs.add(new Attribute(name));
        for (int i = 1; i <= 6; i++) attrs.add(new Attribute("BILL_AMT" + i));
        attrs.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        var raw = new Instances("input", attrs, 4);
        for (int i = 0; i < 4; i++) raw.add(new DenseInstance(1, new double[]{i, 50000 + 40000 * i, i - 2, 2, .5,
                i == 0 ? 0 : 100, 0, 0, 0, 0, 0, i % 2}));
        var prepared = new AssociationService().prepareForApriori(raw);
        assertThat(prepared.attribute("ID")).isNull();
        assertThat(prepared.attribute("RISK_TIER")).isNull();
        assertThat(prepared.attribute("BILL_AMT1")).isNull();
        assertThat(prepared.instance(0).stringValue(prepared.attribute("PAY_RATIO"))).isEqualTo("n/a");
        assertThat(prepared.instance(1).stringValue(prepared.attribute("PAY_RATIO"))).isEqualTo("10-50%");
        assertThat(prepared.instance(0).stringValue(prepared.attribute("PAY_1"))).isEqualTo("-2");
        assertThat(prepared.classIndex()).isEqualTo(prepared.numAttributes() - 1);
    }

    @Test
    void selectsRelaxationOnlyAtEightFamiliesAndCapsItAtTwelve() {
        var original = java.util.Collections.nCopies(6, new AssociationService.RuleRecord(
                "PAY_1=0", "Default=No", .1, .9, 1.1, "non-default", "non-default", 20, 22));
        var relaxed = java.util.Collections.nCopies(13, new AssociationService.RuleRecord(
                "PAY_1=-1", "Default=No", .1, .83, 1.06, "non-default", "non-default", 20, 24));
        var belowGate = AssociationService.selectNonDefaultRules(original, relaxed.subList(0, 7));
        assertThat(belowGate.rules()).isEqualTo(original);
        assertThat(belowGate.pass()).isEqualTo("original");
        assertThat(belowGate.minConfidence()).isEqualTo(.85);
        assertThat(belowGate.minLift()).isEqualTo(1.08);
        var atGate = AssociationService.selectNonDefaultRules(original, relaxed.subList(0, 8));
        assertThat(atGate.rules()).hasSize(8);
        assertThat(atGate.pass()).isEqualTo("relaxed");
        assertThat(atGate.minConfidence()).isEqualTo(.82);
        assertThat(atGate.minLift()).isEqualTo(1.05);
        assertThat(AssociationService.selectNonDefaultRules(original, relaxed).rules()).hasSize(12);
    }

    private static Instances synthetic() {
        var attrs = new ArrayList<Attribute>();
        attrs.add(new Attribute("PAY_1", new ArrayList<>(List.of("0", "2"))));
        attrs.add(new Attribute("AGE", new ArrayList<>(List.of("30-39", "40-49"))));
        attrs.add(new Attribute("SEX", new ArrayList<>(List.of("Male", "Female"))));
        attrs.add(new Attribute("EDUCATION", new ArrayList<>(List.of("Other", "Graduate"))));
        attrs.add(new Attribute("MARRIAGE", new ArrayList<>(List.of("Married", "Single"))));
        attrs.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        var data = new Instances("pruning", attrs, 200);
        for (int i = 0; i < 200; i++) {
            data.add(new DenseInstance(1, new double[]{i < 100 ? 1 : 0, i < 100 ? 0 : 1,
                i % 2, i < 40 || i >= 100 && i < 140 ? 1 : 0, i < 70 || i >= 150 ? 1 : 0, i < 60 ? 1 : 0}));
        }
        return data;
    }
}
