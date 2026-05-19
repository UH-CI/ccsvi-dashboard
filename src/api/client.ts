const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
};

export const getDatasets = () => get<Record<string, unknown>>("/api/v1/datasets");

export const getMetrics = (dataset: string) =>
  get<Record<string, string>[]>(`/api/v1/metrics/${dataset}`);

export const getBlockGroup = (geoid: string) =>
  get<Record<string, unknown>>(`/api/v1/block-groups/${geoid}`);
