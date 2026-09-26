import { z } from "zod";
import {
  AnomalySchema,
  ApiErrorSchema,
  AttritionFlag,
  CardCategory,
  ClusterSchema,
  ClassificationEvaluationSchema,
  EvaluationVariantSchema,
  CustomerSummarySchema,
  CustomerTier,
  EducationLevel,
  EdaChurnGroupSchema,
  EdaCorrelationSchema,
  EdaDistributionSchema,
  EdaDistributionSeriesSchema,
  EdaDistributionStatsSchema,
  FeatureContributionSchema,
  Gender,
  IncomeCategory,
  InsightSchema,
  InsightVisualBarSchema,
  InsightVisualSchema,
  MaritalStatus,
  MethodologySchema,
  MiningReportSchema,
  OverviewResponseSchema,
  PcaPointSchema,
  PredictRequestSchema,
  PredictResponseSchema,
  RuleSchema,
} from "@/lib/schemas";

// All TypeScript types are derived from Zod schemas — single source of truth.

export type Gender = z.infer<typeof Gender>;
export type AttritionFlag = z.infer<typeof AttritionFlag>;
export type CardCategory = z.infer<typeof CardCategory>;
export type IncomeCategory = z.infer<typeof IncomeCategory>;
export type EducationLevel = z.infer<typeof EducationLevel>;
export type MaritalStatus = z.infer<typeof MaritalStatus>;
export type CustomerTier = z.infer<typeof CustomerTier>;

export type PredictRequest = z.infer<typeof PredictRequestSchema>;
export type PredictResponse = z.infer<typeof PredictResponseSchema>;
export type FeatureContribution = z.infer<typeof FeatureContributionSchema>;

export type OverviewResponse = z.infer<typeof OverviewResponseSchema>;
export type EdaDistributionStats = z.infer<typeof EdaDistributionStatsSchema>;
export type EdaDistributionSeries = z.infer<typeof EdaDistributionSeriesSchema>;
export type EdaDistribution = z.infer<typeof EdaDistributionSchema>;
export type EdaCorrelation = z.infer<typeof EdaCorrelationSchema>;
export type EdaChurnGroup = z.infer<typeof EdaChurnGroupSchema>;
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type ClassificationEvaluation = z.infer<typeof ClassificationEvaluationSchema>;
export type EvaluationVariant = z.infer<typeof EvaluationVariantSchema>;
export type Methodology = z.infer<typeof MethodologySchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type InsightVisualBar = z.infer<typeof InsightVisualBarSchema>;
export type InsightVisual = z.infer<typeof InsightVisualSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type PcaPoint = z.infer<typeof PcaPointSchema>;
export type MiningReport = z.infer<typeof MiningReportSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface PageResponse<T> {
  total: number;
  page: number;
  size: number;
  items: T[];
}
