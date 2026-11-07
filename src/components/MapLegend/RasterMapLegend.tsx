import React from "react";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useActiveRaster } from "../../stores";
import { useColormapGradient } from "../../api/queries/colormap";
import { useRasterInfo } from "../../api/queries/rasterInfo";
import styles from "./MapLegend.module.scss";
import { GradientLegend } from "./GradientLegend";

interface RasterMapLegendProps {
  mapId: string;
}

// The active raster's name, units, colour bar and value range
export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const raster = useActiveRaster(mapId);
  const info = useRasterInfo(raster?.id);
  const gradient = useColormapGradient(raster?.colormap);

  if (!raster || !info || !gradient) return null;

  return (
    <GradientLegend
      title={raster.config?.name ?? raster.id}
      icon={<TerrainIcon className={styles["legend-icon"]} />}
      gradient={gradient}
      min={info.min}
      max={info.max}
      units={raster.config?.units}
    />
  );
};
