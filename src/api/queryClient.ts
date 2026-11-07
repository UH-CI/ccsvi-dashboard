import { QueryCache, QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./client";

// The data only changes when the server is rebuilt or redeployed, so an answer is kept for the whole visit.
// A failed request is tried up to 2 more times, except when the server says the request itself was wrong.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => console.error("Request failed:", query.queryKey, error),
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

// Each answer of a list of queries, in order; the same list until one of them changes
export const dataOf = <T>(results: UseQueryResult<T>[]) => results.map((result) => result.data);
