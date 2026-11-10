import { queryOptions } from "@tanstack/react-query";
import { checkHazardFile } from "../client";
import { layerFailureMessage } from "../queryClient";

// Whether a hazard layer's map file can be reached. The map library that draws it can't report a
// failed load, so this asks once, and a failure names the layer.
export const hazardFileQuery = (file: string, layerName: string) =>
  queryOptions({
    queryKey: ["hazard-file", file],
    queryFn: () => checkHazardFile(file),
    meta: { failureMessage: layerFailureMessage(layerName) },
  });
