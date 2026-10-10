package com.creditminer.sequence;

import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Converts one credit-client row into the six chronological itemsets consumed by Weka GSP. */
public final class SequenceBuilder {

    public static final List<String> STATUS_VALUES = List.of(
            "NO_USE", "PAID_FULL", "REVOLVING", "LATE_1", "LATE_2", "LATE_3PLUS");
    public static final List<String> PAYMENT_VALUES = List.of("NONE", "PARTIAL", "COVERED", "NO_BALANCE");

    public BuildResult build(Instances clients) {
        validate(clients);
        List<ClientSequence> defaults = new ArrayList<>();
        List<ClientSequence> nonDefaults = new ArrayList<>();
        for (int row = 0; row < clients.numInstances(); row++) {
            Instance client = clients.instance(row);
            Attribute idAttribute = clients.attribute("ID");
            String id = idAttribute == null ? Integer.toString(row + 1) : idValue(client, idAttribute);
            ClientSequence sequence = clientSequence(client, id);
            (sequence.defaulted() ? defaults : nonDefaults).add(sequence);
        }
        return new BuildResult(defaults, nonDefaults,
                gspInstances("sequences_default", defaults),
                gspInstances("sequences_nondefault", nonDefaults));
    }

    public ClientSequence clientSequence(Instance client) {
        Instances source = client.dataset();
        Attribute idAttribute = source.attribute("ID");
        if (idAttribute == null) throw new IllegalArgumentException("ID attribute is missing");
        return clientSequence(client, idValue(client, idAttribute));
    }

    private ClientSequence clientSequence(Instance client, String id) {
        Instances source = client.dataset();
        boolean defaulted = "Yes".equals(client.stringValue(source.attribute("Default")));
        return new ClientSequence(id, defaulted, sequenceElements(client));
    }

    public List<SequenceElement> sequenceElements(Instance client) {
        Instances source = client.dataset();
        List<SequenceElement> elements = new ArrayList<>(6);
        for (int month = 6; month >= 1; month--) {
            double status = client.value(source.attribute("PAY_" + month));
            // March's bill is unobserved, so April contributes status only (ARFF payment '?').
            if (month == 6) {
                elements.add(new SequenceElement(mapStatus(status), null));
                continue;
            }
            double payment = client.value(source.attribute("PAY_AMT" + month));
            int referenceMonth = month + 1;
            double previousBill = client.value(source.attribute("BILL_AMT" + referenceMonth));
            elements.add(new SequenceElement(mapStatus(status), mapPayment(payment, previousBill)));
        }
        return List.copyOf(elements);
    }

    public void write(BuildResult result, Path defaultPath, Path nonDefaultPath) throws IOException {
        writeArff(result.defaultGsp(), defaultPath);
        writeArff(result.nonDefaultGsp(), nonDefaultPath);
    }

    public static Map<String, Object> itemMapping() {
        Map<String, Object> mapping = new LinkedHashMap<>();
        Map<String, String> status = new LinkedHashMap<>();
        status.put("NO_USE", "PAY_k = -2");
        status.put("PAID_FULL", "PAY_k = -1");
        status.put("REVOLVING", "PAY_k = 0");
        status.put("LATE_1", "PAY_k = 1");
        status.put("LATE_2", "PAY_k = 2");
        status.put("LATE_3PLUS", "PAY_k >= 3");
        Map<String, String> payment = new LinkedHashMap<>();
        payment.put("NONE", "reference bill > 0 and PAY_AMT_k = 0");
        payment.put("PARTIAL", "reference bill > 0 and 0 < PAY_AMT_k < reference bill");
        payment.put("COVERED", "PAY_AMT_k >= reference bill > 0");
        payment.put("NO_BALANCE", "reference bill <= 0 (nothing was due, whatever the payment)");
        mapping.put("order", "PAY_6 (April 2005) through PAY_1 (September 2005)");
        mapping.put("status", status);
        mapping.put("payment", payment);
        mapping.put("paymentRulePrecedence", "April: status only; for months 5..1 use BILL_AMT_(k+1). If reference bill <= 0: NO_BALANCE; else if PAY_AMT_k = 0: NONE; else if PAY_AMT_k < reference bill: PARTIAL; else: COVERED");
        mapping.put("oldestMonthReference", "April (PAY_6) has no payment item because March's bill is unobserved");
        return mapping;
    }

    private static Instances gspInstances(String relation, List<ClientSequence> clients) {
        ArrayList<String> ids = new ArrayList<>(clients.stream().map(ClientSequence::id).toList());
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("SEQ_ID", ids));
        attributes.add(new Attribute("STATUS", new ArrayList<>(STATUS_VALUES)));
        attributes.add(new Attribute("PAYMENT", new ArrayList<>(PAYMENT_VALUES)));
        Instances data = new Instances(relation, attributes, clients.size() * 6);
        for (ClientSequence client : clients) {
            int idIndex = data.attribute("SEQ_ID").indexOfValue(client.id());
            for (SequenceElement element : client.elements()) {
                data.add(new DenseInstance(1.0, new double[]{
                        idIndex,
                        data.attribute("STATUS").indexOfValue(element.status()),
                        element.payment() == null ? Double.NaN
                                : data.attribute("PAYMENT").indexOfValue(element.payment())}));
            }
        }
        return data;
    }

    private static void writeArff(Instances data, Path path) throws IOException {
        if (path.getParent() != null) Files.createDirectories(path.getParent());
        try (Writer writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(data.toString());
        }
    }

    static String mapStatus(double value) {
        if (value == -2) return "NO_USE";
        if (value == -1) return "PAID_FULL";
        if (value == 0) return "REVOLVING";
        if (value == 1) return "LATE_1";
        if (value == 2) return "LATE_2";
        if (value >= 3) return "LATE_3PLUS";
        throw new IllegalArgumentException("Unsupported repayment status: " + value);
    }

    static String mapPayment(double payment, double previousBill) {
        if (previousBill <= 0) return "NO_BALANCE";
        if (payment == 0) return "NONE";
        if (payment < 0) throw new IllegalArgumentException("Negative payment amount: " + payment);
        if (payment < previousBill) return "PARTIAL";
        return "COVERED";
    }

    private static String idValue(Instance client, Attribute idAttribute) {
        if (idAttribute.isNominal() || idAttribute.isString()) return client.stringValue(idAttribute);
        double value = client.value(idAttribute);
        return value == Math.rint(value) ? Long.toString(Math.round(value)) : Double.toString(value);
    }

    private static void validate(Instances clients) {
        List<String> required = new ArrayList<>(List.of("Default"));
        for (int month = 1; month <= 6; month++) {
            required.add("PAY_" + month);
            required.add("BILL_AMT" + month);
            required.add("PAY_AMT" + month);
        }
        List<String> missing = required.stream().filter(name -> clients.attribute(name) == null).toList();
        if (!missing.isEmpty()) throw new IllegalArgumentException("Missing sequence columns: " + missing);
        Attribute target = clients.attribute("Default");
        if (!target.isNominal() || target.indexOfValue("Yes") < 0 || target.indexOfValue("No") < 0) {
            throw new IllegalArgumentException("Default must be nominal with No and Yes values");
        }
    }

    public record SequenceElement(String status, String payment) {
        public Set<String> items() {
            return payment == null ? Set.of(status) : Set.of(status, payment);
        }

        public boolean containsAll(Set<String> wanted) {
            for (String item : wanted) {
                if (!status.equals(item) && !java.util.Objects.equals(payment, item)) return false;
            }
            return true;
        }

        int mask() {
            return itemBit(status) | (payment == null ? 0 : itemBit(payment));
        }

        private static int itemBit(String item) {
            return switch (item) {
                case "NO_USE" -> 1;
                case "PAID_FULL" -> 1 << 1;
                case "REVOLVING" -> 1 << 2;
                case "LATE_1" -> 1 << 3;
                case "LATE_2" -> 1 << 4;
                case "LATE_3PLUS" -> 1 << 5;
                case "NONE" -> 1 << 6;
                case "PARTIAL" -> 1 << 7;
                case "COVERED" -> 1 << 8;
                case "NO_BALANCE" -> 1 << 9;
                default -> throw new IllegalArgumentException("Unknown sequence item: " + item);
            };
        }
    }

    public record ClientSequence(String id, boolean defaulted, List<SequenceElement> elements) {
    }

    public record BuildResult(
            List<ClientSequence> defaultClients,
            List<ClientSequence> nonDefaultClients,
            Instances defaultGsp,
            Instances nonDefaultGsp) {
    }
}
