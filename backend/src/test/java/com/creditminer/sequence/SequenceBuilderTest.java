package com.creditminer.sequence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SequenceBuilderTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void mapsSixMonthsOldestFirstAndWritesAllNominalArff() throws Exception {
        Instances clients = clients();
        SequenceBuilder builder = new SequenceBuilder();

        SequenceBuilder.BuildResult result = builder.build(clients);

        assertEquals(1, result.defaultClients().size());
        assertEquals(1, result.nonDefaultClients().size());
        assertEquals(List.of("NO_USE", "PAID_FULL", "REVOLVING", "LATE_1", "LATE_2", "LATE_3PLUS"),
                result.defaultClients().get(0).elements().stream()
                        .map(SequenceBuilder.SequenceElement::status).toList());
        assertEquals(Arrays.asList(null, "PARTIAL", "COVERED", "PARTIAL", "PARTIAL", "NO_BALANCE"),
                result.defaultClients().get(0).elements().stream()
                        .map(SequenceBuilder.SequenceElement::payment).toList());

        Path defaults = temporaryDirectory.resolve("defaults.arff");
        Path nonDefaults = temporaryDirectory.resolve("nondefaults.arff");
        builder.write(result, defaults, nonDefaults);
        try (Reader reader = Files.newBufferedReader(defaults, StandardCharsets.UTF_8)) {
            Instances written = new Instances(reader);
            assertEquals(6, written.numInstances());
            assertEquals("NO_USE", written.instance(0).stringValue(written.attribute("STATUS")));
            assertTrue(written.instance(0).isMissing(written.attribute("PAYMENT")));
            assertEquals(4, written.attribute("PAYMENT").numValues());
            for (int index = 0; index < written.numAttributes(); index++) {
                assertFalse(written.attribute(index).isNumeric());
            }
        }
    }

    @Test
    void mapsPaymentUsingBillPrecedence() {
        assertEquals("NO_BALANCE", SequenceBuilder.mapPayment(0, 0));
        assertEquals("NO_BALANCE", SequenceBuilder.mapPayment(25, -10));
        assertEquals("NO_BALANCE", SequenceBuilder.mapPayment(0, -10));
        assertEquals("NO_BALANCE", SequenceBuilder.mapPayment(25, 0));
        assertEquals("NONE", SequenceBuilder.mapPayment(0, 100));
        assertEquals("PARTIAL", SequenceBuilder.mapPayment(25, 100));
        assertEquals("COVERED", SequenceBuilder.mapPayment(100, 100));
        assertEquals("COVERED", SequenceBuilder.mapPayment(125, 100));
    }

    @Test
    void aprilHasStatusOnlyRegardlessOfItsPaymentAndBill() {
        Instances clients = clients();
        clients.instance(0).setValue(clients.attribute("PAY_AMT6"), 999);
        clients.instance(0).setValue(clients.attribute("BILL_AMT6"), -10);
        List<SequenceBuilder.SequenceElement> elements = new SequenceBuilder()
                .sequenceElements(clients.instance(0));
        assertEquals(Set.of("NO_USE"), elements.get(0).items());
        assertTrue(elements.get(0).containsAll(Set.of("NO_USE")));
        assertFalse(elements.get(0).containsAll(Set.of("COVERED")));
        assertEquals("NO_BALANCE", elements.get(1).payment());
    }

    private static Instances clients() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("ID"));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("BILL_AMT" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_AMT" + month));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances clients = new Instances("clients", attributes, 2);
        clients.setClassIndex(clients.numAttributes() - 1);

        addClient(clients, 101, new double[]{3, 2, 1, 0, -1, -2},
                new double[]{100, -5, 50, 100, 100, 100},
                new double[]{100, 1, 50, 100, 50, 0}, 1);
        addClient(clients, 102, new double[]{0, 0, 0, 0, 0, 0},
                new double[]{100, 100, 100, 100, 100, 100},
                new double[]{10, 10, 10, 10, 10, 10}, 0);
        return clients;
    }

    private static void addClient(Instances data, double id, double[] statuses,
                                  double[] bills, double[] payments, int defaultIndex) {
        double[] values = new double[data.numAttributes()];
        values[0] = id;
        System.arraycopy(statuses, 0, values, 1, 6);
        System.arraycopy(bills, 0, values, 7, 6);
        System.arraycopy(payments, 0, values, 13, 6);
        values[data.classIndex()] = defaultIndex;
        data.add(new DenseInstance(1.0, values));
    }
}
