import axios, { AxiosError, type AxiosInstance } from "axios";
import { API_BASE_URL } from "@/lib/constants";
import type {
  Anomaly,
  ApiError,
  Cluster,
  CustomerSummary,
  Insight,
  OverviewResponse,
  PageResponse,
  PcaPoint,
  PredictRequest,
  PredictResponse,
  Rule,
} from "@/types/api.types";

/**
 * HTTP client for the CreditMiner backend.
 *
 * <p>Wraps axios with:
 * <ul>
 *   <li>Base URL from {@link API_BASE_URL}</li>
 *   <li>10 s timeout</li>
 *   <li>Error envelope normalization — every thrown error is shaped like
 *       {@link ApiError}'s {@code error} object</li>
 * </ul>
 * </p>
 */
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

client.interceptors.response.use(
  (r) => r,
  (err: AxiosError<ApiError>) => {
    const data = err.response?.data;
    const normalized = data?.error ?? {
      code: err.code ?? "NETWORK_ERROR",
      message: err.message ?? "Request failed",
    };
    return Promise.reject(normalized);
  },
);

// ===== Endpoints =====

export const api = {
  overview: () => client.get<OverviewResponse>("/overview").then((r) => r.data),

  edaDistribution: (col: string, bins = 20) =>
    client
      .get<{ column: string; binEdges: number[]; counts: number[] }>(
        `/eda/distribution`,
        { params: { col, bins } },
      )
      .then((r) => r.data),

  edaCorrelation: () =>
    client
      .get<{ columns: string[]; matrix: number[][] }>(`/eda/correlation`)
      .then((r) => r.data),

  edaChurnBy: (dim: string) =>
    client
      .get<Array<{ group: string; count: number; attritedCount: number; churnRate: number }>>(
        `/eda/churn-by`,
        { params: { dim } },
      )
      .then((r) => r.data),

  edaPca2d: () => client.get<PcaPoint[]>(`/eda/pca-2d`).then((r) => r.data),

  customers: (params: {
    page?: number;
    size?: number;
    attritionFlag?: string;
    clusterId?: number;
    sort?: string;
  }) =>
    client
      .get<PageResponse<CustomerSummary>>(`/customers`, { params })
      .then((r) => r.data),

  customer: (id: number) => client.get(`/customers/${id}`).then((r) => r.data),

  clusters: () => client.get<Cluster[]>(`/clusters`).then((r) => r.data),

  clusterCustomers: (id: number, page = 1, size = 20) =>
    client
      .get<PageResponse<CustomerSummary>>(`/clusters/${id}/customers`, { params: { page, size } })
      .then((r) => r.data),

  // Note: BE retention rules cap at lift = 1/0.84 ≈ 1.19 due to 84% Existing
  // class prevalence. minLift=1.2 returns 0 rows; default is 1.0 to surface all 50.
  rules: (minLift = 1.0, category?: string) =>
    client
      .get<Rule[]>(`/rules`, { params: { minLift, category } })
      .then((r) => r.data),

  predict: (body: PredictRequest) =>
    client.post<PredictResponse>(`/predict`, body).then((r) => r.data),

  insights: (category?: string) =>
    client.get<Insight[]>(`/insights`, { params: { category } }).then((r) => r.data),

  anomalies: (limit = 50) =>
    client.get<Anomaly[]>(`/anomalies`, { params: { limit } }).then((r) => r.data),
};

export type ApiClient = typeof api;
