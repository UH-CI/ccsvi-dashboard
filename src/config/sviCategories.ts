import menu from "../../config/census_menu.json";
import { switchedOn } from "./layerFiles";

export interface SviIndicator {
  dataset: string;
  metric: string;
  label: string;
  description?: string; //description for UI
  calculationDescription?: string;
  isCount?: boolean; //raw counts, mostly 0s: legend shows whole numbers and 0 gets its own bin
  // Switched off: kept in the file, left out of the menu
  off?: boolean;
}

export interface SviCategory {
  id: string;
  label: string;
  description?: string; //category level description for UI
  indicators: SviIndicator[];
}

// The census indicator menu in config/census_menu.json, without the switched-off indicators
export const SVI_CATEGORIES = switchedOn(menu.categories as SviCategory[], "indicators");

// The SVI menu's name for a metric, or the raw metric name if the menu doesn't list it
export const sviLabel = (dataset: string | undefined, metric: string): string =>
  SVI_CATEGORIES.flatMap((c) => c.indicators).find(
    (i) => i.dataset === dataset && i.metric === metric,
  )?.label ?? metric;

export const sviCalculationDescription = (
  dataset: string | undefined,
  metric: string,
): string | undefined =>
  SVI_CATEGORIES.flatMap((c) => c.indicators).find(
    (i) => i.dataset === dataset && i.metric === metric,
  )?.calculationDescription;

export const sviIsCount = (dataset: string | undefined, metric: string): boolean =>
  SVI_CATEGORIES.flatMap((c) => c.indicators).find(
    (i) => i.dataset === dataset && i.metric === metric,
  )?.isCount ?? false;
