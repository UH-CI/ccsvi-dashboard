import menu from "../../config/census_menu.json";
import { switchedOn } from "./layerFiles";

export interface SviIndicator {
  // The indicator's metric key: what a map holds, the link carries, and values are asked for by
  key: string;
  dataset: string;
  metric: string;
  label: string;
  description?: string; //description for UI
  calculationDescription?: string;
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

const INDICATORS = SVI_CATEGORIES.flatMap((c) => c.indicators);

// Every switched-on indicator's key; a link naming any other is ignored
export const MENU_KEYS = new Set(INDICATORS.map((i) => i.key));

// The switched-on menu entry with this key
export const indicatorOf = (key: string) => INDICATORS.find((i) => i.key === key);

// The menu's name for an indicator
export const sviLabel = (key: string): string => indicatorOf(key)!.label;

export const sviCalculationDescription = (key: string): string | undefined =>
  indicatorOf(key)?.calculationDescription;
