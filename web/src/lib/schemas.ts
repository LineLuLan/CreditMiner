import { z } from "zod";

/**
 * Zod schemas mirroring the BE → FE handoff contract
 * (see docs/BE_Handoff.md §4).
 *
 * Single source of truth on the FE side. ALL types in
 * `web/src/types/api.types.ts` are inferred from these — never write
 * a type by hand.
 */

// ---------- Enums ----------
export const Gender = z.enum(["M", "F"]);
export const AttritionFlag = z.enum(["Existing Customer", "Attrited Customer"]);
export const CardCategory = z.enum(["Blue", "Silver", "Gold", "Platinum"]);
export const IncomeCategory = z.enum([
  "Less than $40K",
  "$40K - $60K",
  "$60K - $80K",
  "$80K - $120K",
  "$120K +",
  "Unknown",
]);
export const EducationLevel = z.enum([
  "Uneducated",
  "High School",
  "College",
  "Graduate",
  "Post-Graduate",
  "Doctorate",
  "Unknown",
]);
export const MaritalStatus = z.enum(["Single", "Married", "Divorced", "Unknown"]);
export const CustomerTier = z.enum(["Bronze", "Silver", "Gold", "Platinum"]);

// ---------- PredictRequest ----------
export const PredictRequestSchema = z.object({
  customerAge: z.number().int().min(18).max(100),
  gender: Gender,
  dependentCount: z.number().int().min(0).max(10),
  educationLevel: EducationLevel,
  maritalStatus: MaritalStatus,
  incomeCategory: IncomeCategory,
  cardCategory: CardCategory,
  monthsOnBook: z.number().int().min(0),
  totalRelationshipCount: z.number().int().min(1).max(10),
  monthsInactive12Mon: z.number().int().min(0).max(12),
  contactsCount12Mon: z.number().int().min(0).max(20),
  creditLimit: z.number().nonnegative(),
  totalRevolvingBal: z.number().nonnegative(),
  totalTransAmt: z.number().nonnegative(),
  totalTransCt: z.number().int().min(0),
  avgUtilizationRatio: z.number().min(0).max(1),
  // Optional Q4/Q1 quarterly change ratios (BE defaults to 1.0 when omitted).
  totalAmtChngQ4Q1: z.number().nonnegative().optional(),
  totalCtChngQ4Q1: z.number().nonnegative().optional(),
});

// ---------- PredictResponse ----------
export const FeatureContributionSchema = z.object({
  name: z.string(),
  contribution: z.number(),
});

export const PredictResponseSchema = z.object({
  churnProb: z.number().min(0).max(1),
  label: z.enum(["Existing", "Attrited"]),
  riskScore: z.number().min(0).max(1),
  cluster: z.number().int(),
  clusterName: z.string(),
  topFeatures: z.array(FeatureContributionSchema),
  recommendation: z.string(),
  modelUsed: z.string(),
});

// ---------- Overview ----------
export const OverviewResponseSchema = z.object({
  totalCustomers: z.number().int(),
  attritedCount: z.number().int(),
  churnRate: z.number().min(0).max(1),
  avgRiskScore: z.number(),
  avgUtilization: z.number(),
  tierBreakdown: z.record(z.number()),
});

// ---------- Customers ----------
export const CustomerSummarySchema = z.object({
  clientNum: z.number(),
  attritionFlag: AttritionFlag,
  customerAge: z.number().int().nullable(),
  gender: Gender.nullable(),
  cardCategory: CardCategory.nullable(),
  customerTier: CustomerTier.nullable(),
  riskScore: z.number().nullable(),
  clusterId: z.number().int().nullable(),
  isOutlier: z.boolean().nullable(),
  isAnomaly: z.boolean().nullable(),
});

export const PageResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    total: z.number().int(),
    page: z.number().int(),
    size: z.number().int(),
    items: z.array(item),
  });

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
  source: z.string(),
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
  insights: z.array(InsightSchema),
  warnings: z.array(z.string()),
});

// ---------- Error envelope ----------
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    timestamp: z.string().optional(),
    path: z.string().optional(),
  }),
});
