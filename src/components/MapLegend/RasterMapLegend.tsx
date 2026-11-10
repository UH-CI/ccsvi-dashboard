import React from "react";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useMapRaster } from "../../stores/useMapLayersStore";
import { useColormapGradient } from "../../api/queries/colormap";
import { useRasterInfo } from "../../api/queries/rasterInfo";
import styles from "./MapLegend.module.scss";
import { GradientLegend } from "./GradientLegend";

interface RasterMapLegendProps {
  mapId: string;
}

// The name, units, colour bar and value range of the map's raster, saved or HCDP
export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const shown = useMapRaster(mapId);
  const info = useRasterInfo(shown?.source);
  const gradient = useColormapGradient(shown?.colormap);

  if (!shown || !info || !gradient) return null;

  return (
    <GradientLegend
      title={shown.name}
      icon={
        shown.raster.kind === "hcdp" ? (
          <CloudQueueIcon className={styles["legend-icon"]} />
        ) : (
          <TerrainIcon className={styles["legend-icon"]} />
        )
      }
      gradient={gradient}
      min={info.min}
      max={info.max}
      units={shown.units}
    />
  );
};
