import axios, { AxiosError, type AxiosInstance } from "axios";
import { z } from "zod";
import { API_BASE_URL } from "@/lib/constants";
import {
  AnomalySchema,
  ClusterSchema,
  CustomerDetailSchema,
  CustomerSummarySchema,
  EdaCorrelationSchema,
  EdaDefaultGroupSchema,
  EdaDescribeSchema,
  EdaDistributionSchema,
  InsightSchema,
  InsightVisualSchema,
  MiningReportSchema,
  OverviewResponseSchema,
  PageResponseSchema,
  PcaPointSchema,
  PcaMetaSchema,
  FactsResponseSchema,
  PredictRequestSchema,
  PredictResponseSchema,
  RuleSchema,
  SequenceArtifactSchema,
} from "@/lib/schemas";
import type {
  Anomaly,
  ApiError,
  Cluster,
  CustomerDetail,
  CustomerSummary,
  EdaCorrelation,
  EdaDefaultGroup,
  EdaDescribe,
  EdaDistribution,
  Insight,
  InsightVisual,
  MiningReport,
  OverviewResponse,
  PageResponse,
  PcaPoint,
  PredictRequest,
  PredictResponse,
  Rule,
  SequenceArtifact,
} from "@/types/api.types";

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const data = error.response?.data;
    const normalized = data?.error ?? {
      code: error.code ?? "NETWORK_ERROR",
      message: error.message ?? "Request failed",
    };
    return Promise.reject(normalized);
  },
);

export interface CustomerQueryParams {
  page?: number;
  size?: number;
  defaultFlag?: "No" | "Yes";
  clusterId?: number;
  sort?: string;
}

export const api = {
  facts: () => client.get("/facts").then((response) => FactsResponseSchema.parse(response.data)),
  edaPcaMeta: () => client.get("/eda/pca-2d/meta").then((response) => PcaMetaSchema.parse(response.data)),
  overview: () =>
    client
      .get<OverviewResponse>("/overview")
      .then((response) => OverviewResponseSchema.parse(response.data)),

  edaDescribe: () =>
    client
      .get<EdaDescribe>("/eda/describe")
      .then((response) => EdaDescribeSchema.parse(response.data)),

  edaDistribution: (col: string, bins = 20, split?: "Default") =>
    client
      .get<EdaDistribution>("/eda/distribution", { params: { col, bins, split } })
      .then((response) => EdaDistributionSchema.parse(response.data)),

  edaCorrelation: () =>
    client
      .get<EdaCorrelation>("/eda/correlation")
      .then((response) => EdaCorrelationSchema.parse(response.data)),

  edaDefaultBy: (dim: string) =>
    client
      .get<EdaDefaultGroup[]>("/eda/default-by", { params: { dim } })
      .then((response) => z.array(EdaDefaultGroupSchema).parse(response.data)),

  edaPca2d: () =>
    client
      .get<PcaPoint[]>("/eda/pca-2d")
      .then((response) => z.array(PcaPointSchema).parse(response.data)),

  customers: (params: CustomerQueryParams) =>
    client
      .get<PageResponse<CustomerSummary>>("/customers", {
        params: { sort: "clientId,asc", ...params },
      })
      .then((response) => PageResponseSchema(CustomerSummarySchema).parse(response.data)),

  customer: (id: number) =>
    client
      .get<CustomerDetail>(`/customers/${id}`)
      .then((response) => CustomerDetailSchema.parse(response.data)),

  clusters: () =>
    client
      .get<Cluster[]>("/clusters")
      .then((response) => z.array(ClusterSchema).parse(response.data)),

  clusterCustomers: (id: number, page = 1, size = 20) =>
    client
      .get<PageResponse<CustomerSummary>>(`/clusters/${id}/customers`, {
        params: { page, size, sort: "clientId,asc" },
      })
      .then((response) => PageResponseSchema(CustomerSummarySchema).parse(response.data)),

  rules: (minLift = 1.0, category?: "default" | "non-default") =>
    client
      .get<Rule[]>("/rules", { params: { minLift, category } })
      .then((response) => z.array(RuleSchema).parse(response.data)),

  predict: (body: PredictRequest) => {
    const request = PredictRequestSchema.parse(body);
    return client
      .post<PredictResponse>("/predict", request)
      .then((response) => PredictResponseSchema.parse(response.data));
  },

  insights: (category?: "driver" | "segment" | "context") =>
    client
      .get<Insight[]>("/insights", { params: { category } })
      .then((response) => z.array(InsightSchema).parse(response.data)),

  insightVisuals: () =>
    client
      .get<InsightVisual[]>("/insights/visuals")
      .then((response) => z.array(InsightVisualSchema).parse(response.data)),

  anomalies: (limit = 50) =>
    client
      .get<Anomaly[]>("/anomalies", { params: { limit } })
      .then((response) => z.array(AnomalySchema).parse(response.data)),

  miningReport: () =>
    client
      .get<MiningReport>("/mining-report")
      .then((response) => MiningReportSchema.parse(response.data)),

  sequences: () =>
    client
      .get<SequenceArtifact>("/sequences")
      .then((response) => SequenceArtifactSchema.parse(response.data)),
};

export type ApiClient = typeof api;
