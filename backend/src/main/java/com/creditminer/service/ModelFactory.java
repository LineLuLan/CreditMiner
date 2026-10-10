package com.creditminer.service;

import weka.classifiers.Classifier;
import weka.classifiers.CostMatrix;
import weka.classifiers.bayes.NaiveBayes;
import weka.classifiers.functions.Logistic;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.meta.FilteredClassifier;
import weka.classifiers.trees.J48;
import weka.classifiers.trees.RandomForest;
import weka.core.Randomizable;
import weka.filters.Filter;
import weka.filters.MultiFilter;
import weka.filters.supervised.instance.SMOTE;
import weka.filters.unsupervised.attribute.NominalToBinary;
import weka.filters.unsupervised.attribute.Standardize;

import java.util.ArrayList;
import java.util.List;

/** Spring-free construction of every classifier variant used by the pipeline and CLI. */
public final class ModelFactory {

    public enum Algorithm {
        DECISIONTREE, RANDOMFOREST, NAIVEBAYES, LOGISTIC
    }

    public enum Variant {
        baseline, smote, cost
    }

    public Classifier create(Algorithm algorithm, Variant variant, int seed) {
        if (variant == Variant.cost
                && algorithm != Algorithm.DECISIONTREE
                && algorithm != Algorithm.RANDOMFOREST) {
            throw new IllegalArgumentException("cost is supported only for DECISIONTREE and RANDOMFOREST");
        }
        Classifier base = base(algorithm, seed);
        if (variant == Variant.cost) return costSensitive(base, seed);

        List<Filter> filters = new ArrayList<>();
        if (variant == Variant.smote) {
            SMOTE smote = new SMOTE();
            smote.setRandomSeed(seed);
            filters.add(smote);
        }
        if (algorithm == Algorithm.NAIVEBAYES || algorithm == Algorithm.LOGISTIC) {
            filters.add(new Standardize());
        }
        if (algorithm == Algorithm.LOGISTIC) filters.add(new NominalToBinary());
        if (filters.isEmpty()) return base;

        FilteredClassifier classifier = new FilteredClassifier();
        setSeed(classifier, seed);
        if (filters.size() == 1) {
            classifier.setFilter(filters.get(0));
        } else {
            MultiFilter chain = new MultiFilter();
            chain.setFilters(filters.toArray(Filter[]::new));
            setSeed(chain, seed);
            classifier.setFilter(chain);
        }
        classifier.setClassifier(base);
        return classifier;
    }

    public Classifier base(Algorithm algorithm, int seed) {
        try {
            Classifier classifier = switch (algorithm) {
                case DECISIONTREE -> {
                    J48 tree = new J48();
                    tree.setOptions(new String[]{"-C", "0.25", "-M", "2"});
                    yield tree;
                }
                case RANDOMFOREST -> {
                    RandomForest forest = new RandomForest();
                    forest.setNumIterations(100);
                    forest.setComputeAttributeImportance(true);
                    yield forest;
                }
                case NAIVEBAYES -> new NaiveBayes();
                case LOGISTIC -> new Logistic();
            };
            setSeed(classifier, seed);
            return classifier;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to build classifier " + algorithm, exception);
        }
    }

    public CostSensitiveClassifier costSensitive(Classifier base) {
        return costSensitive(base, 42);
    }

    public CostSensitiveClassifier costSensitive(Classifier base, int seed) {
        CostSensitiveClassifier classifier = new CostSensitiveClassifier();
        setSeed(classifier, seed);
        classifier.setClassifier(base);
        CostMatrix costs = new CostMatrix(2);
        costs.setCell(0, 0, 0.0);
        costs.setCell(0, 1, 1.0);
        costs.setCell(1, 0, 5.0);
        costs.setCell(1, 1, 0.0);
        classifier.setCostMatrix(costs);
        classifier.setMinimizeExpectedCost(false);
        return classifier;
    }

    private static void setSeed(Object component, int seed) {
        if (component instanceof Randomizable randomizable) randomizable.setSeed(seed);
    }

    public static String fileName(Algorithm algorithm, Variant variant) {
        return algorithm.name() + (variant == Variant.baseline ? "" : "_" + variant.name().toUpperCase())
                + ".model";
    }
}
