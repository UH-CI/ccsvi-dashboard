import { queryOptions, useQuery } from "@tanstack/react-query";
import { getColormap } from "../client";

// A colour bar's colours, from /api/v1/rasters/colormap
export const colormapQuery = (name: string) =>
  queryOptions({
    queryKey: ["colormap", name],
    queryFn: () => getColormap(name),
  });

// The colours as a bottom-to-top CSS gradient of about 16 stops
const toGradient = (entries: [number, number, number, number][]): string => {
  const step = Math.max(1, Math.floor(entries.length / 16));
  const sampled = entries.filter((_, i) => i % step === 0 || i === entries.length - 1);
  const stops = sampled
    .map(([r, g, b, a], i) => {
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}${Math.round(a).toString(16).padStart(2, "0")}`;
      return `${hex} ${(i / Math.max(1, sampled.length - 1)) * 100}%`;
    })
    .join(", ");
  return `linear-gradient(to top, ${stops})`;
};

// Waits until a colour scheme is chosen
export const useColormapGradient = (name: string | undefined) =>
  useQuery({ ...colormapQuery(name ?? ""), enabled: Boolean(name), select: toGradient }).data;
