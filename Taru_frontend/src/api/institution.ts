import { apiRequest } from "./client";
import {
  InstitutionAuthResponse,
  InstitutionResponse,
  MoodTrendBucket,
  MoodTrendRange,
  InstitutionMoodOverviewResponse,
  MoodOverviewRange,
  MoodOverviewSort,
  MoodOverviewStatus,
  InstitutionWellnessTrend,
  InstitutionCohortFilters,
  InstitutionWellnessFilterOptions,
} from "../types";

function cohortParams(filters: InstitutionCohortFilters) {
  const params = new URLSearchParams();

  for (const field of ["batch", "gender"] as const) {
    if (filters[field]) params.set(field, filters[field]);
  }

  if (filters.ageRange) params.set("ageRange", filters.ageRange);
  return params;
}

export const fetchInstitutionWellnessFilterOptions = async () =>
  apiRequest("/api/institution/analytics/filter-options", {
    method: "GET",
  }) as Promise<{
    success: boolean;
    data: InstitutionWellnessFilterOptions;
  }>;

export interface MoodOverviewFilters {
  range: MoodOverviewRange;
  status: MoodOverviewStatus;
  sort: MoodOverviewSort;
  search: string;
  page: number;
  limit: number;
  minScore?: number;
  maxScore?: number;
}

export const loginInstitution = async (
  collegeName: string,
  password: string,
): Promise<InstitutionAuthResponse> => {
  return apiRequest("/api/institution/login", {
    method: "POST",
    body: JSON.stringify({ collegeName, password }),
  });
};

export const registerInstitution = async (data: {
  collegeName: string;
  contactEmail: string;
  password: string;
}): Promise<InstitutionAuthResponse> => {
  return apiRequest("/api/institution/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const fetchInstitutionProfile =
  async (): Promise<InstitutionResponse> => {
    return apiRequest("/api/institution/me", { method: "GET" });
  };

export const fetchAnalytics = async (filters: InstitutionCohortFilters) => {
  const params = cohortParams(filters);
  return apiRequest(`/api/institution/analytics?${params.toString()}`, {
    method: "GET",
  });
};

export const fetchStudents = async () => {
  return apiRequest("/api/institution/students", { method: "GET" });
};

export const fetchMoodOverview = async (filters: MoodOverviewFilters) => {
  const params = new URLSearchParams({
    range: filters.range,
    status: filters.status,
    sort: filters.sort,
    search: filters.search,
    page: String(filters.page),
    limit: String(filters.limit),
  });

  if (filters.minScore !== undefined) {
    params.set("minScore", String(filters.minScore));
  }
  if (filters.maxScore !== undefined) {
    params.set("maxScore", String(filters.maxScore));
  }

  return apiRequest(`/api/institution/mood-overview?${params.toString()}`, {
    method: "GET",
  }) as Promise<{
    success: boolean;
    data: InstitutionMoodOverviewResponse;
  }>;
};

export const fetchStudentMoodTrend = async (
  studentId: string,
  range: MoodTrendRange,
): Promise<{ success: boolean; data: MoodTrendBucket[] }> =>
  apiRequest(
    `/api/institution/students/${encodeURIComponent(studentId)}/mood-trend?range=${range}`,
    { method: "GET" },
  );

export const fetchInstitutionWellnessTrend = async (
  range: MoodOverviewRange,
  filters: InstitutionCohortFilters,
): Promise<{ success: boolean; data: InstitutionWellnessTrend }> => {
  const params = cohortParams(filters);
  params.set("range", range);

  return apiRequest(`/api/institution/analytics/trends?${params.toString()}`, {
    method: "GET",
  });
};
