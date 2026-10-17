import { z } from "zod";
import { EDUCATION_VALUES } from "@/lib/constants";
import { SequenceArtifactViewSchema } from "@/components/report/sequence-data";

/** Runtime schemas for the backend API contract. */

// ---------- Shared enums ----------
export const Sex = z.enum(["Male", "Female"]);
export const Education = z.enum(EDUCATION_VALUES);
export const Marriage = z.enum(["Married", "Single", "Other"]);
export const DefaultFlag = z.enum(["No", "Yes"]);
export const RiskTier = z.enum(["Low", "Medium", "High"]);

const RepaymentStatus = z.number().int().min(-2).max(9);

// ---------- Prediction ----------
export const PredictRequestSchema = z
  .object({
    limitBal: z.number(),
    sex: Sex,
    education: Education,
    marriage: Marriage,
    age: z.number().int(),
    pay1: RepaymentStatus,
    pay2: RepaymentStatus,
    pay3: RepaymentStatus,
    pay4: RepaymentStatus,
    pay5: RepaymentStatus,
    pay6: RepaymentStatus,
    billAmt1: z.number(),
    billAmt2: z.number(),
    billAmt3: z.number(),
    billAmt4: z.number(),
    billAmt5: z.number(),
    billAmt6: z.number(),
    payAmt1: z.number().nonnegative(),
    payAmt2: z.number().nonnegative(),
    payAmt3: z.number().nonnegative(),
    payAmt4: z.number().nonnegative(),
    payAmt5: z.number().nonnegative(),
    payAmt6: z.number().nonnegative(),
  })
  .passthrough();

export const FeatureContributionSchema = z
  .object({
    name: z.string(),
    contribution: z.number(),
  })
  .passthrough();

export const PredictResponseSchema = z
  .object({
    defaultProb: z.number().min(0).max(1),
    label: DefaultFlag,
    riskTier: RiskTier,
    cluster: z.number().int(),
    clusterName: z.string(),
    topFeatures: z.array(FeatureContributionSchema),
    recommendation: z.string(),
    modelUsed: z.string(),
    importanceMethod: z.string().optional(),
  })
  .passthrough();

// ---------- Overview ----------
export const OverviewResponseSchema = z
  .object({
    totalCustomers: z.number().int().nonnegative(),
    defaultCount: z.number().int().nonnegative(),
    defaultRate: z.number().min(0).max(1),
    avgPayRatio: z.number(),
    avgUtilization: z.number(),
    riskTierBreakdown: z.record(z.number().int().nonnegative()),
  })
  .passthrough();

// ---------- EDA ----------
export const EdaColumnSummarySchema = z
  .object({
    name: z.string(),
    type: z.enum(["numeric", "nominal"]),
    count: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
    missingPct: z.number().nonnegative(),
    mean: z.number().nullable().optional(),
    std: z.number().nullable().optional(),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    median: z.number().nullable().optional(),
    distinctCount: z.number().int().nonnegative().optional(),
    topValue: z.string().optional(),
    topCount: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const EdaDescribeSchema = z
  .object({
    totalRows: z.number().int().nonnegative(),
    totalColumns: z.number().int().nonnegative(),
    classColumn: z.string(),
    leakageColumnsDropped: z.array(z.string()),
    columns: z.array(EdaColumnSummarySchema),
    generatedAt: z.string(),
  })
  .passthrough();

export const EdaDistributionStatsSchema = z
  .object({
    count: z.number(),
    mean: z.number(),
    std: z.number(),
    min: z.number(),
    q1: z.number(),
    median: z.number(),
    q3: z.number(),
    max: z.number(),
  })
  .passthrough();

export const EdaDistributionSeriesSchema = z
  .object({
    label: DefaultFlag,
    counts: z.array(z.number()),
    stats: EdaDistributionStatsSchema.nullable().optional(),
  })
  .passthrough();

export const EdaDistributionSchema = z
  .object({
    column: z.string(),
    type: z.enum(["numeric", "nominal"]),
    binEdges: z.array(z.number()),
    edges: z.array(z.number()).optional(),
    binning: z.enum(["equal-width", "quantile"]).optional(),
    notes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    counts: z.array(z.number()),
    stats: EdaDistributionStatsSchema.nullable().optional(),
    series: z.array(EdaDistributionSeriesSchema).nullable().optional(),
  })
  .passthrough();

export const EdaCorrelationSchema = z
  .object({
    columns: z.array(z.string()),
    matrix: z.array(z.array(z.number())),
  })
  .passthrough();

export const EdaDefaultGroupSchema = z
  .object({
    group: z.string(),
    count: z.number().int().nonnegative(),
    defaultCount: z.number().int().nonnegative(),
    defaultRate: z.number().min(0).max(1),
  })
  .passthrough();

// ---------- Customers ----------
export const CustomerSummarySchema = z
  .object({
    clientId: z.number().int(),
    defaultFlag: DefaultFlag,
    age: z.number().int().nullable(),
    sex: Sex.nullable(),
    education: Education.nullable(),
    riskTier: RiskTier.nullable(),
    payRatio: z.number().nullable(),
    clusterId: z.number().int().nullable(),
    isOutlier: z.boolean().nullable(),
    isAnomaly: z.boolean().nullable(),
  })
  .passthrough();

export const CustomerDetailSchema = z
  .object({
    clientId: z.number().int(),
    limitBal: z.number(),
    sex: Sex,
    education: Education,
    marriage: Marriage,
    age: z.number().int(),
    pay1: z.number().int(),
    pay2: z.number().int(),
    pay3: z.number().int(),
    pay4: z.number().int(),
    pay5: z.number().int(),
    pay6: z.number().int(),
    billAmt1: z.number(),
    billAmt2: z.number(),
    billAmt3: z.number(),
    billAmt4: z.number(),
    billAmt5: z.number(),
    billAmt6: z.number(),
    payAmt1: z.number(),
    payAmt2: z.number(),
    payAmt3: z.number(),
    payAmt4: z.number(),
    payAmt5: z.number(),
    payAmt6: z.number(),
    defaultFlag: DefaultFlag,
    utilization1: z.number(),
    avgUtilization: z.number(),
    payRatio: z.number(),
    monthsDelayed: z.number().int(),
    maxDelay: z.number().int(),
    billTrend: z.number(),
    riskTier: RiskTier,
    clusterId: z.number().int().nullable(),
    isOutlier: z.boolean(),
    isAnomaly: z.boolean(),
    centroidDistance: z.number().nullable().optional(),
  })
  .passthrough();

export const PageResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      size: z.number().int().positive(),
      items: z.array(item),
    })
    .passthrough();

export const SequencePatternSchema = SequenceArtifactViewSchema.shape.topDefaultPatterns.element;
export const SequenceArtifactSchema = SequenceArtifactViewSchema;

export * from "./mining-report-schemas";

// ---------- Error envelope ----------
export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
        timestamp: z.string().optional(),
        path: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const PcaMetaSchema = z.object({
  explainedVariance: z.array(z.number()),
  explainedVarianceOfTotal: z.array(z.number()).nullish(),
  explainedVarianceScope: z.string().optional(),
  zoomBounds: z.object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number() }),
  outsideCount: z.number().int().nonnegative(),
  pointCount: z.number().int().nonnegative(),
});

export const FactSchema = z.object({
  factId: z.string(), label: z.string(), value: z.number(), unit: z.string(),
  n: z.number().nullish(), baseline: z.number().nullish(), multiplier: z.number().nullish(),
  ci95: z.object({ low: z.number(), high: z.number() }).nullish(),
  name: z.string().optional(), aucDrop: z.number().optional(),
  definition: z.string(), source: z.string(), category: z.string(),
}).passthrough();

export const FactsResponseSchema = z.object({
  version: z.string(), generatedAt: z.string(),
  baseline: z.object({ defaultRate: z.number(), totalClients: z.number(), defaultCount: z.number() }),
  facts: z.array(FactSchema),
});
