import { QueryCache, QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useErrorToastStore } from "../stores/useErrorToastStore";
import { ApiError } from "./client";

declare module "@tanstack/react-query" {
  interface Register {
    // failureMessage: shown to the user when the query fails for good
    queryMeta: { failureMessage?: string };
  }
}

// The data only changes when the server is rebuilt or redeployed, so an answer is kept for the whole visit.
// A failed request is tried up to 2 more times, except when the server says the request itself was wrong.
// When it still fails, it's logged, and its failureMessage, if it has one, is shown.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("Request failed:", query.queryKey, error);
      if (query.meta?.failureMessage) useErrorToastStore.getState().show(query.meta.failureMessage);
    },
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

// The message when a map layer's data couldn't be loaded, named as the menu names it
export const layerFailureMessage = (layerName: string) => `Couldn't load ${layerName}.`;

// Each answer of a list of queries, in order; the same list until one of them changes
export const dataOf = <T>(results: UseQueryResult<T>[]) => results.map((result) => result.data);
