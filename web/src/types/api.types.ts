import { z } from "zod";
import {
  AnomalySchema,
  ApiErrorSchema,
  AttritionFlag,
  CardCategory,
  ClusterSchema,
  CustomerSummarySchema,
  CustomerTier,
  EducationLevel,
  FeatureContributionSchema,
  Gender,
  IncomeCategory,
  InsightSchema,
  MaritalStatus,
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
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type PcaPoint = z.infer<typeof PcaPointSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface PageResponse<T> {
  total: number;
  page: number;
  size: number;
  items: T[];
}
