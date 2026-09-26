package com.creditminer.service;

import org.junit.jupiter.api.Test;
import weka.associations.Apriori;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AssociationServiceTest {

    @Test
    void churnAprioriFindsRareConsequentDespiteManyHigherSupportRules() throws Exception {
        Instances data = rareChurnDataset();
        AssociationService service = new AssociationService();

        Apriori apriori = service.runChurnApriori(data, AssociationService.CHURN_MIN_SUPPORT);
        List<AssociationService.RuleRecord> rules = service.extractChurnRules(apriori, data.numInstances());

        assertTrue(rules.stream().anyMatch(rule ->
                        "Attrition_Flag=Attrited Customer".equals(rule.rhs())),
                "Expected the rare Attrited Customer consequent to survive higher-support rules");
    }

    private static Instances rareChurnDataset() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        List<String> binaryValues = List.of("no", "yes");
        for (int i = 0; i < 8; i++) {
            attributes.add(new Attribute("CommonSignal" + i, new ArrayList<>(binaryValues)));
        }
        attributes.add(new Attribute("RareSignal", new ArrayList<>(binaryValues)));
        attributes.add(new Attribute("Attrition_Flag",
                new ArrayList<>(List.of("Existing Customer", "Attrited Customer"))));

        Instances data = new Instances("rare-churn", attributes, 200);
        for (int row = 0; row < 200; row++) {
            DenseInstance instance = new DenseInstance(attributes.size());
            instance.setDataset(data);
            String commonValue = row < 100 ? "yes" : "no";
            for (int column = 0; column < 8; column++) {
                instance.setValue(column, commonValue);
            }
            boolean attrited = row < 30;
            instance.setValue(8, row < 4 ? "yes" : "no");
            instance.setValue(9, attrited ? "Attrited Customer" : "Existing Customer");
            data.add(instance);
        }
        return data;
    }
}
