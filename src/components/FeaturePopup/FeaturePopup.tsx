import type { ReactNode } from "react";
import styles from "./FeaturePopup.module.scss";
import type {
  LayerDisplayValues,
  MetricKind,
  PointLayerConfig,
  Reliability,
  SubHazardLayerConfig,
} from "../../types";
import { RELIABILITY_COLORS } from "../../config/colorSchemes";
import { PointLayerIcon } from "../../utils/pointLayerIcon";

interface PopupField {
  key: string;
  label: string;
}

export interface HcdpPopupField {
  label: string;
  meanValue?: number | null;
  maxValue?: number | null;
  loading?: boolean;
}

export interface OverlayPopupField {
  label: string;
  meanValue?: number | null;
  maxValue?: number | null;
  loading?: boolean;
  suffix?: string;
}

export interface PointCountsPopupField {
  loading?: boolean;
  // The rows to show; a count that couldn't be fetched is null and shows as N/A
  items: { layer: PointLayerConfig; value: number | null }[];
}

// An indicator's row; a value of null means the area has none and shows N/A
export interface MetricDisplay {
  name: string;
  value: number | null;
  kind: MetricKind;
  moePp: number | null;
  reliability: Reliability | null;
}

interface FeaturePopupProps {
  metadata?: string[];
  // The clicked shape's column values
  properties: Record<string, unknown>;
  fields: PopupField[];
  displayValues?: LayerDisplayValues;
  metric1?: MetricDisplay;
  metric2?: MetricDisplay;
  hcdp?: HcdpPopupField;
  overlay?: OverlayPopupField;
  pointCounts?: PointCountsPopupField;
}

// One label and value line of the popup
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className={styles["popup-field"]}>
    <span className={styles["popup-field-label"]}>{label}:</span>
    <span className={styles["popup-field-value"]}>{children}</span>
  </div>
);

// A raster's mean and max for the area, or "Calculating…" while they load
const RasterStatsRows = ({ field }: { field: HcdpPopupField | OverlayPopupField }) => {
  const suffix = "suffix" in field ? (field.suffix ?? "") : "";
  const show = (value: number | null | undefined) =>
    value != null ? `${value.toFixed(2)}${suffix}` : "N/A";
  if (field.loading) return <Row label={field.label}>Calculating…</Row>;
  return (
    <>
      <Row label={`${field.label} (mean)`}>{show(field.meanValue)}</Row>
      <Row label={`${field.label} (max)`}>{show(field.maxValue)}</Row>
    </>
  );
};

// An indicator's value with its margin of error, then how reliable it is
const MetricRows = ({ metric }: { metric: MetricDisplay }) => (
  <>
    <Row label={metric.name}>
      {metric.value === null
        ? "N/A"
        : metric.kind === "percentage"
          ? `${metric.value.toFixed(1)}%`
          : metric.value.toFixed(0)}
      {metric.value !== null && metric.moePp !== null ? ` ± ${metric.moePp} pp` : ""}
    </Row>
    {metric.reliability && (
      <div className={`${styles["popup-field"]} ${styles["popup-reliability"]}`}>
        <span className={styles["popup-field-label"]}>Data Reliability:</span>
        <span
          className={styles["popup-field-value"]}
          style={{ color: RELIABILITY_COLORS[metric.reliability.tier] }}
        >
          {metric.reliability.label}
        </span>
      </div>
    )}
  </>
);

// One popup for a map shape: its heading lines, then its rows
export function FeaturePopup({
  metadata,
  properties,
  fields,
  displayValues,
  metric1,
  metric2,
  hcdp,
  overlay,
  pointCounts,
}: FeaturePopupProps) {
  const displayProperty = (key: string) => {
    const value = properties[key];
    if (value == null) return "N/A";
    return displayValues?.[key]?.[String(value)] ?? String(value);
  };

  return (
    <div>
      {metadata && metadata.length > 0 && (
        <div className={styles["popup-metadata"]}>
          {metadata.map((line) => (
            <div key={line} className={styles["popup-metadata-line"]}>
              {line}
            </div>
          ))}
        </div>
      )}
      <div className={styles["popup-fields"]}>
        {fields.map((field) => (
          <Row key={field.key} label={field.label}>
            {displayProperty(field.key)}
          </Row>
        ))}
        {metric1 && <MetricRows metric={metric1} />}
        {metric2 && <MetricRows metric={metric2} />}
        {hcdp && <RasterStatsRows field={hcdp} />}
        {overlay && <RasterStatsRows field={overlay} />}
        {pointCounts?.loading && <Row label="Nearby">Calculating…</Row>}
        {pointCounts &&
          !pointCounts.loading &&
          pointCounts.items.map(({ layer, value }) => (
            <Row key={layer.id} label={layer.name}>
              {value ?? "N/A"}
              <PointLayerIcon layer={layer} />
            </Row>
          ))}
      </div>
    </div>
  );
}

// A map layer's shape or point. Heading: the title column's value, else the layer name. Then the
// hand-labelled fields, then every other column with a value under its raw name
export function LayerPopup({
  properties,
  popup,
  layerName,
  displayValues,
}: {
  properties: Record<string, unknown>;
  popup: SubHazardLayerConfig["popup"];
  layerName: string;
  displayValues?: LayerDisplayValues;
}) {
  const title = popup?.title ? properties[popup.title] : undefined;
  const listed = popup?.fields ?? [];
  const rest = Object.keys(properties)
    .filter((key) => properties[key] != null && key !== popup?.title)
    .filter((key) => !listed.some((field) => field.key === key))
    .map((key) => ({ key, label: key }));
  return (
    <FeaturePopup
      metadata={[String(title || layerName)]}
      properties={properties}
      fields={[...listed, ...rest]}
      displayValues={displayValues}
    />
  );
}
