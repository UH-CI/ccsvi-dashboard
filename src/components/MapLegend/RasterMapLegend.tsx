import React from "react";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useActiveRaster, useHcdpOverlay } from "../../stores";
import { useColormapGradient } from "../../api/queries/colormap";
import { useRasterInfo } from "../../api/queries/rasterInfo";
import type { RasterSource } from "../../types";
import styles from "./MapLegend.module.scss";
import { GradientLegend } from "./GradientLegend";

interface RasterMapLegendProps {
  mapId: string;
}

// The name, units, colour bar and value range of the map's raster: its HCDP layer or its active raster layer
export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const hcdp = useHcdpOverlay(mapId);
  const raster = useActiveRaster(mapId);

  const cogSource: RasterSource | undefined = raster ? { kind: "cog", id: raster.id } : undefined;
  const source = hcdp?.source ?? cogSource;
  const info = useRasterInfo(source);
  const gradient = useColormapGradient(hcdp ? "hcdp" : raster?.colormap);

  if (!source || !info || !gradient) return null;

  return (
    <GradientLegend
      title={hcdp?.title ?? raster?.config?.name ?? raster?.id ?? ""}
      icon={
        hcdp ? (
          <CloudQueueIcon className={styles["legend-icon"]} />
        ) : (
          <TerrainIcon className={styles["legend-icon"]} />
        )
      }
      gradient={gradient}
      min={info.min}
      max={info.max}
      units={hcdp ? undefined : raster?.config?.units}
    />
  );
};
