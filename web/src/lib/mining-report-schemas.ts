import { z } from "zod";

// ---------- Clusters ----------
export const ClusterSchema = z.object({
  clusterId: z.number().int(),
  personaName: z.string(),
  size: z.number().int(),
  centroid: z.record(z.number()),
  avgRisk: z.number(),
  churnRate: z.number(),
  description: z.string(),
});

// ---------- Rules ----------
export const RuleSchema = z.object({
  ruleId: z.number(),
  lhs: z.string(),
  rhs: z.string(),
  support: z.number(),
  confidence: z.number(),
  lift: z.number(),
  category: z.enum(["churn", "retention"]),
});

// ---------- Insights ----------
export const InsightSchema = z.object({
  insightId: z.number(),
  title: z.string(),
  discovery: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
  category: z.enum(["churn", "cluster", "risk", "opportunity"]),
  priority: z.number().int(),
});

export const InsightVisualBarSchema = z.object({
  label: z.string(),
  value: z.number(),
  n: z.number().int().nonnegative(),
  highlight: z.boolean(),
});

export const InsightVisualSchema = z.object({
  title: z.string(),
  headline: z.object({
    value: z.string(),
    label: z.string(),
  }),
  lift: z.string().nullable(),
  unit: z.string(),
  baseline: z
    .object({
      value: z.number(),
      label: z.string(),
    })
    .nullable(),
  axis: z.string(),
  bars: z.array(InsightVisualBarSchema),
});

// ---------- Anomalies ----------
export const AnomalySchema = z.object({
  clientNum: z.number(),
  reason: z.string(),
  score: z.number(),
  clusterId: z.number().int().nullable(),
});

// ---------- PCA-2D ----------
export const PcaPointSchema = z.object({
  clientNum: z.number(),
  clusterId: z.number().int(),
  x: z.number(),
  y: z.number(),
});

// ---------- Mining Report ----------
export const NameCountSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export const ColumnMissingSchema = z.object({
  name: z.string(),
  missing: z.number().int(),
  missingPct: z.number(),
});

export const ModelMetricSchema = z.object({
  model: z.string(),
  variant: z.string(),
  testF1: z.number().nullable().optional(),
  testRocAuc: z.number().nullable().optional(),
  testPrAuc: z.number().nullable().optional(),
  testAccuracy: z.number().nullable().optional(),
  cvAccuracy: z.number().nullable().optional(),
  cvF1: z.number().nullable().optional(),
  cvRocAuc: z.number().nullable().optional(),
  cvPrAuc: z.number().nullable().optional(),
  testPrecision: z.number().nullable().optional(),
  testRecall: z.number().nullable().optional(),
  source: z.string(),
});

const OptionalMetricSetSchema = z.object({
  accuracy: z.number().nullable().optional(),
  precisionAttrited: z.number().nullable().optional(),
  recallAttrited: z.number().nullable().optional(),
  f1Attrited: z.number().nullable().optional(),
  rocAuc: z.number().nullable().optional(),
  prAuc: z.number().nullable().optional(),
  kappa: z.number().nullable().optional(),
});

export const ConfusionMatrixSchema = z
  .object({
    labels: z.array(z.string()).optional(),
    matrix: z.array(z.array(z.number())).optional(),
  })
  .optional();

export const EvaluationVariantSchema = z.object({
  algo: z.string().optional(),
  variant: z.string().optional(),
  modelFile: z.string().nullable().optional(),
  isCanonical: z.boolean().optional(),
  hyperparameters: z
    .object({ options: z.string().nullable().optional(), summary: z.string().optional() })
    .optional(),
  trainTimeMs: z.number().nullable().optional(),
  cv: OptionalMetricSetSchema.optional(),
  test: OptionalMetricSetSchema.extend({
    confusionMatrix: ConfusionMatrixSchema,
    perClass: z
      .array(
        z.object({
          label: z.string().optional(),
          precision: z.number().nullable().optional(),
          recall: z.number().nullable().optional(),
          f1: z.number().nullable().optional(),
          support: z.number().nullable().optional(),
        }),
      )
      .optional(),
  }).optional(),
  rocCurve: z
    .array(
      z.object({
        fpr: z.number().nullable().optional(),
        tpr: z.number().nullable().optional(),
        threshold: z.number().nullable().optional(),
      }),
    )
    .transform((points) =>
      points
        .filter((point) => point.fpr != null && point.tpr != null)
        .map((point) => ({ ...point, fpr: point.fpr!, tpr: point.tpr! })),
    )
    .optional(),
  prCurve: z
    .array(
      z.object({
        recall: z.number().nullable().optional(),
        precision: z.number().nullable().optional(),
        threshold: z.number().nullable().optional(),
      }),
    )
    .transform((points) =>
      points
        .filter((point) => point.recall != null && point.precision != null)
        .map((point) => ({ ...point, recall: point.recall!, precision: point.precision! })),
    )
    .optional(),
});

export const EvaluationSplitSchema = z.object({
  strategy: z.string().optional(),
  trainRatio: z.number().optional(),
  seed: z.number().optional(),
  trainRows: z.number().optional(),
  testRows: z.number().optional(),
  cvFolds: z.number().optional(),
  positiveClass: z.string().optional(),
  classDistributionTrain: z.record(z.number()).optional(),
  classDistributionTest: z.record(z.number()).optional(),
  smoteTrainRows: z.number().optional(),
});

export const ClassificationEvaluationSchema = z.object({
  split: EvaluationSplitSchema.nullable().optional(),
  variants: z.array(EvaluationVariantSchema).optional(),
  bestVariant: z
    .object({
      algo: z.string().optional(),
      variant: z.string().optional(),
      selectionRule: z.string().optional(),
    })
    .optional(),
});

export const MethodologySchema = z.object({
  preprocessing: z
    .object({
      rowsIn: z.number().optional(),
      rowsOut: z.number().optional(),
      duplicatesDropped: z.number().optional(),
      unknownRewritten: z.record(z.number()).optional(),
      numericMedianImputed: z.record(z.number()).optional(),
      outlierByColumn: z
        .record(
          z.object({
            zscoreCount: z.number().optional(),
            iqrCount: z.number().optional(),
            combinedCount: z.number().optional(),
            mean: z.number().optional(),
            std: z.number().optional(),
            q1: z.number().optional(),
            q3: z.number().optional(),
          }),
        )
        .optional(),
      leakageColumnsDropped: z.array(z.string()).optional(),
      outlierPolicy: z.string().optional(),
    })
    .optional(),
  featureEngineering: z
    .object({
      columnsIn: z.number().optional(),
      columnsOut: z.number().optional(),
      derivedFeatures: z
        .array(
          z.object({
            name: z.string().optional(),
            type: z.string().optional(),
            mean: z.number().nullable().optional(),
            std: z.number().nullable().optional(),
            min: z.number().nullable().optional(),
            max: z.number().nullable().optional(),
            formula: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  split: EvaluationSplitSchema.nullable().optional(),
  clustering: z
    .object({
      kMin: z.number().optional(),
      kMax: z.number().optional(),
      bestK: z.number().optional(),
      strategy: z.string().optional(),
      seed: z.number().optional(),
      maxIterations: z.number().optional(),
      normalization: z.string().optional(),
      featuresUsed: z.array(z.string()).optional(),
      elbow: z
        .array(z.object({ k: z.number(), wcss: z.number(), silhouette: z.number() }))
        .optional(),
    })
    .optional(),
  associationRules: z
    .object({
      discretization: z.string().optional(),
      attributesUsed: z.array(z.string()).optional(),
      retentionPass: z
        .object({
          minSupport: z.number().optional(),
          minConfidence: z.number().optional(),
          minLift: z.number().optional(),
          numRules: z.number().optional(),
        })
        .optional(),
      churnPass: z
        .object({
          minSupport: z.number().optional(),
          minLift: z.number().optional(),
          numRules: z.number().optional(),
          metric: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  anomaly: z
    .object({
      rule: z.string().optional(),
      mu: z.number().optional(),
      sigma: z.number().optional(),
      strongThreshold: z.number().optional(),
      mildThreshold: z.number().optional(),
    })
    .optional(),
});

export const FeatureImportanceReportSchema = z.object({
  name: z.string(),
  importance: z.number(),
  share: z.number(),
});

export const ElbowPointSchema = z.object({
  k: z.number().int(),
  wcss: z.number(),
  silhouette: z.number(),
});

export const MiningReportSchema = z.object({
  generatedAt: z.string(),
  dataset: z.object({
    totalRows: z.number().int(),
    totalColumns: z.number().int(),
    classColumn: z.string(),
    numericColumns: z.number().int(),
    categoricalColumns: z.number().int(),
    totalMissingValues: z.number().int(),
    dbCustomerRows: z.number(),
    attritedCustomers: z.number(),
    churnRate: z.number(),
    attritionBreakdown: z.array(NameCountSchema),
    topMissingColumns: z.array(ColumnMissingSchema),
    tierBreakdown: z.record(z.number()),
    leakageColumnsDropped: z.array(z.string()),
  }),
  classification: z.object({
    bestModel: z.string(),
    bestVariant: z.string(),
    metricSource: z.string(),
    modelMetrics: z.array(ModelMetricSchema),
    featureImportance: z.array(FeatureImportanceReportSchema),
    evaluation: ClassificationEvaluationSchema.nullable().optional(),
  }),
  clustering: z.object({
    bestK: z.number().int(),
    strategy: z.string(),
    totalClusters: z.number().int(),
    clusters: z.array(ClusterSchema),
    elbowScores: z.array(ElbowPointSchema),
  }),
  rules: z.object({
    totalRules: z.number(),
    churnRules: z.number(),
    retentionRules: z.number(),
    avgSupport: z.number(),
    avgConfidence: z.number(),
    avgLift: z.number(),
    minLift: z.number(),
    maxLift: z.number(),
    topRules: z.array(RuleSchema),
  }),
  anomalies: z.object({
    dbOutlierCount: z.number(),
    dbAnomalyCount: z.number(),
    phase2OutlierCount: z.number().nullable().optional(),
    clusterStrongOutlierCount: z.number().nullable().optional(),
    clusterMildOutlierCount: z.number().nullable().optional(),
    combinedAnomalyCount: z.number().nullable().optional(),
    combinedAnomalyPct: z.number().nullable().optional(),
    clusterDistanceMu: z.number().nullable().optional(),
    clusterDistanceSigma: z.number().nullable().optional(),
    strongThreshold: z.number().nullable().optional(),
    mildThreshold: z.number().nullable().optional(),
    rule: z.string().nullable().optional(),
    topAnomalies: z.array(AnomalySchema),
  }),
  methodology: MethodologySchema.nullable().optional(),
  insights: z.array(InsightSchema),
  warnings: z.array(z.string()),
});
