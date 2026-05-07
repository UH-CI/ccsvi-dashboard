import React from "react";
import { Stack, Typography } from "@mui/material";
import styles from "./HCDPLoad.module.scss";

export interface HCDPLoadProps {
  /** Map that will receive HCDP raster overlays once processing is wired up. */
  mapId: string;
}

export const HCDPLoad: React.FC<HCDPLoadProps> = ({ mapId }) => {
  return (
    <Stack spacing={1} className={styles.root}>
      <Typography variant="body2" color="text.secondary" className={styles.blurb}>
        Hawaiʻi Climate Data Portal (HCDP) controls will target map <strong>{mapId}</strong>.
        Calendar, parameters, and API-driven GeoTIFF handling for Leaflet will live in this module.
      </Typography>
    </Stack>
  );
};
