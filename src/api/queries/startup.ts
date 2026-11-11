import { useQueries } from "@tanstack/react-query";
import { ApiError } from "../client";
import { boundaryQuery } from "./boundaries";
import { datasetsQuery } from "./datasets";
import { geographiesQuery } from "./geographies";
import { metricsQuery } from "./metrics";

// What the app needs before it can show anything, each with the message shown if it fails
const STARTUP = [
  { query: geographiesQuery, failure: "Failed to fetch geography metadata" },
  { query: datasetsQuery, failure: "Failed to fetch dataset metadata" },
  { query: metricsQuery, failure: "Failed to fetch metric list" },
  { query: boundaryQuery("blockGroups"), failure: "Failed to fetch census block group data" },
  { query: boundaryQuery("homelands"), failure: "Failed to fetch hawaiian homelands data" },
  { query: boundaryQuery("counties"), failure: "Failed to fetch county boundaries data" },
];

export function useStartupData(): { ready: boolean; errors: string[] } {
  return useQueries({
    queries: STARTUP.map(({ query }) => query),
    combine: (results) => ({
      ready: results.every((result) => result.isSuccess),
      errors: results.flatMap((result, i) =>
        result.isError
          ? [
              `${STARTUP[i].failure}: ${result.error instanceof ApiError ? result.error.status : result.error.message}`,
            ]
          : [],
      ),
    }),
  });
}
