import React from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Link, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useDatasets } from "../../api/queries/datasets";
import { HAZARD_LAYERS } from "../../config/hazardLayers";
import { POLYGON_LAYERS } from "../../config/layers";
import { POINT_LAYERS } from "../../config/pointLayers";
import { RASTER_LAYERS } from "../../config/rasterLayers";
import type { LayerMetadata } from "../../types";
import { layerSources, mergeSameSources, type Source } from "../../utils/citation";
import { HCDP_DATA_TYPES } from "../../utils/hcdpRaster";
import styles from "./CitationsDialog.module.scss";

// The map layers' sources: lines and polygons, then rasters, then points
const MAP_LAYER_SOURCES = mergeSameSources(
  layerSources([...HAZARD_LAYERS, ...RASTER_LAYERS, ...POINT_LAYERS]),
);

// The area outlines' sources
const BOUNDARY_SOURCES = mergeSameSources(layerSources(Object.values(POLYGON_LAYERS)));

// The HCDP data types' sources, under the names the HCDP menu shows
const HCDP_SOURCES: Source[] = HCDP_DATA_TYPES.map((type) => ({
  names: [type.name],
  metadata: type.metadata,
}));

// The full citation: the source's own as it gives it, else APA (author, date, title in italics,
// "[Data set]", publisher, then the publisher's page)
function FullCitation({ metadata }: { metadata: LayerMetadata }) {
  if ("citation" in metadata) return <>{metadata.citation}</>;
  const [month, year] = metadata.period.split(" ");
  return (
    <>
      {metadata.author}. ({year ? `${year}, ${month}` : month}). <em>{metadata.title}</em> [Data
      set]. {metadata.publisher}.
      {metadata.link && (
        <>
          {" "}
          <Link
            href={metadata.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles["link"]}
          >
            {metadata.link}
          </Link>
        </>
      )}
    </>
  );
}

// One source: the names on screen that use it and its full citation
function SourceEntry({ names, metadata }: Source) {
  return (
    <li className={styles["entry"]}>
      <Typography variant="subtitle1" component="h4" className={styles["entry-title"]}>
        {names.join(", ")}
      </Typography>
      <Typography variant="body2">
        <FullCitation metadata={metadata} />
      </Typography>
      {metadata.note && (
        <Typography variant="body2" className={styles["detail"]}>
          {metadata.note}
        </Typography>
      )}
    </li>
  );
}

interface CitationsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Every data source's full citation, by where it shows in the app
export const CitationsDialog: React.FC<CitationsDialogProps> = ({ open, onClose }) => {
  const datasets = useDatasets();
  const censusSources = mergeSameSources(
    Object.values(datasets ?? {}).flatMap((dataset) =>
      dataset.metadata ? [{ names: [dataset.label], metadata: dataset.metadata }] : [],
    ),
  );
  const sections: [string, Source[]][] = [
    ["Social Vulnerability Indicators", censusSources],
    ["Map Layers", MAP_LAYER_SOURCES],
    ["Hawaiʻi Climate Data Portal", HCDP_SOURCES],
    ["Boundaries", BOUNDARY_SOURCES],
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{ paper: { className: styles["dialog-paper"] } }}
    >
      <DialogTitle className={styles["dialog-title"]}>
        Citations
        <IconButton onClick={onClose} size="small" aria-label="Close citations">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {sections.map(([heading, sources]) => (
          <section key={heading} className={styles["section"]}>
            <Typography variant="h6" component="h3" className={styles["section-heading"]}>
              {heading}
            </Typography>
            <ul className={styles["list"]}>
              {sources.map((source) => (
                <SourceEntry key={source.names.join()} {...source} />
              ))}
            </ul>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
};
