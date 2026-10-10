import { z } from "zod";
import {
  AnomalySchema,
  ApiErrorSchema,
  ClassificationEvaluationSchema,
  ClusterSchema,
  CustomerDetailSchema,
  CustomerSummarySchema,
  DefaultFlag,
  Education,
  EdaColumnSummarySchema,
  EdaCorrelationSchema,
  EdaDefaultGroupSchema,
  EdaDescribeSchema,
  EdaDistributionSchema,
  EdaDistributionSeriesSchema,
  EdaDistributionStatsSchema,
  EvaluationVariantSchema,
  FeatureContributionSchema,
  InsightSchema,
  InsightVisualBarSchema,
  InsightVisualSchema,
  Marriage,
  MethodologySchema,
  MiningReportSchema,
  OverviewResponseSchema,
  PageResponseSchema,
  PcaPointSchema,
  PcaMetaSchema,
  FactsResponseSchema,
  PredictRequestSchema,
  PredictResponseSchema,
  RiskTier,
  RuleSchema,
  RuleConditionSchema,
  SequencePatternSchema,
  SequenceArtifactSchema,
  Sex,
} from "@/lib/schemas";

// Public API types are derived from the runtime schemas above.
export type Sex = z.infer<typeof Sex>;
export type Education = z.infer<typeof Education>;
export type Marriage = z.infer<typeof Marriage>;
export type DefaultFlag = z.infer<typeof DefaultFlag>;
export type RiskTier = z.infer<typeof RiskTier>;

export type PredictRequest = z.infer<typeof PredictRequestSchema>;
export type PredictResponse = z.infer<typeof PredictResponseSchema>;
export type FeatureContribution = z.infer<typeof FeatureContributionSchema>;

export type OverviewResponse = z.infer<typeof OverviewResponseSchema>;
export type EdaColumnSummary = z.infer<typeof EdaColumnSummarySchema>;
export type EdaDescribe = z.infer<typeof EdaDescribeSchema>;
export type EdaDistributionStats = z.infer<typeof EdaDistributionStatsSchema>;
export type EdaDistributionSeries = z.infer<typeof EdaDistributionSeriesSchema>;
export type EdaDistribution = z.infer<typeof EdaDistributionSchema>;
export type EdaCorrelation = z.infer<typeof EdaCorrelationSchema>;
export type EdaDefaultGroup = z.infer<typeof EdaDefaultGroupSchema>;
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type ClassificationEvaluation = z.infer<typeof ClassificationEvaluationSchema>;
export type EvaluationVariant = z.infer<typeof EvaluationVariantSchema>;
export type Methodology = z.infer<typeof MethodologySchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type SequencePattern = z.infer<typeof SequencePatternSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type InsightVisualBar = z.infer<typeof InsightVisualBarSchema>;
export type InsightVisual = z.infer<typeof InsightVisualSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type PcaPoint = z.infer<typeof PcaPointSchema>;
export type MiningReport = z.infer<typeof MiningReportSchema>;
export type SequenceArtifact = z.infer<typeof SequenceArtifactSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type PageResponse<T> = z.infer<ReturnType<typeof PageResponseSchema<z.ZodType<T>>>>;

export type PcaMeta = z.infer<typeof PcaMetaSchema>;
export type FactsResponse = z.infer<typeof FactsResponseSchema>;
