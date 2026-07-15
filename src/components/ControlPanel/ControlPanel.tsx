import React, { useCallback, useMemo, useState } from "react";
import {
  Typography,
  Button,
  Paper,
  Divider,
  Box,
  Chip,
  Tooltip,
  IconButton,
  Popover,
} from "@mui/material";
import {
  Camera,
  CloudQueue,
  Layers,
  LocationOn,
  Warning,
  Refresh,
  Terrain,
  ExpandMore,
  GridView,
  CalendarViewWeek,
  Assessment,
  Factory,
  BarChart,
} from "@mui/icons-material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useHCDPStore,
} from "../../stores";
import { HCDPLoad } from "../HCDP";
import { SingleMapControls } from "./SingleMapControls";
import styles from "./ControlPanel.module.scss";
import { MapsMenu } from "./components/MapsMenu";
import { SviMenu } from "./components/SviMenu";
import { PointsMenu } from "./components/PointsMenu";
import { LocationsMenu } from "./components/LocationsMenu";
import { HazardsMenu } from "./components/HazardsMenu";
import { HcdpMenu } from "./components/HcdpMenu";
import { RastersMenu } from "./components/RastersMenu";
import { AnalyzerMenu } from "./components/AnalyzerMenu";

interface IntegratedControlPanelProps {
  maxMaps: number;
  isGridView?: boolean;
  onToggleGridView?: () => void;
  onSnapshot?: () => void | Promise<void>;
}

type PopoverKey =
  | "maps"
  | "svi"
  | "points"
  | "locations"
  | "hazards"
  | "rasters"
  | "HCDP"
  | "analyzer"
  | null;

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({
  maxMaps,
  isGridView = true,
  onToggleGridView,
  onSnapshot,
}) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const resetMapStore = useMapStore((state) => state.reset);
  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);
  const clearHCDP = useHCDPStore((s) => s.clearRasterOverlay);

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<NonNullable<PopoverKey>, HTMLElement>>>({});
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const [infoKey, setInfoKey] = useState<NonNullable<PopoverKey> | null>(null);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);

  const openMenu = useCallback((key: NonNullable<PopoverKey>, el: HTMLElement) => {
    setAnchors({ [key]: el });
  }, []);

  const closeMenu = useCallback((key: NonNullable<PopoverKey>) => {
    setAnchors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleButtonClick = useCallback(
    (key: NonNullable<PopoverKey>, e: React.MouseEvent<HTMLElement>) => {
      if (anchors[key]) {
        closeMenu(key);
      } else {
        openMenu(key, e.currentTarget);
      }
    },
    [anchors, openMenu, closeMenu],
  );

  const handleResetView = useCallback(() => {
    resetMapStore();

    mapConfigs.forEach((map) => {
      setVisiblePointLayerIds(map.id, []);
      setVisibleHazardLayerIds(map.id, []);
      setVisibleRasterLayerIds(map.id, []);
      clearHCDP(map.id);
    });
    setAnchors({});
  }, [
    resetMapStore,
    setVisiblePointLayerIds,
    setVisibleHazardLayerIds,
    setVisibleRasterLayerIds,
    mapConfigs,
  ]);

  const handleSnapshot = useCallback(() => {
    setAnchors({});
    void onSnapshot?.();
  }, [onSnapshot]);

  const handleInfoClick = useCallback(
    (key: NonNullable<PopoverKey>, e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      setInfoAnchor(e.currentTarget);
      setInfoKey(key);
    },
    [],
  );

  const handleInfoClose = useCallback(() => {
    setInfoAnchor(null);
    setInfoKey(null);
  }, []);

  const navItems: {
    key: NonNullable<PopoverKey>;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      key: "maps",
      label: "Maps",
      icon: <Layers fontSize="small" />,
      description:
        "Add, remove, and configure map panels. Adjust per-map settings such as title and visibility.",
    },
    {
      key: "svi",
      label: "Social Vulnerability Indicators",
      icon: <Assessment fontSize="small" />,
      description:
        "Select social vulnerability metrics to visualize as a choropleth layer. Indicators are grouped by category and can be compared bivariatly using the Compare with selector.",
    },
    {
      key: "points",
      label: "Critical Infrastructure",
      icon: <LocationOn fontSize="small" />,
      description:
        "Overlay point data for critical infrastructure including hospitals, fire stations, police stations, emergency shelters, schools, and road networks.",
    },
    {
      key: "locations",
      label: "Locations of Enhanced Exposure",
      icon: <Factory fontSize="small" />,
      description:
        "Show locations that may be particularly vulnerable to environmental or climate hazards, such as onsite sewage disposal systems.",
    },
    {
      key: "hazards",
      label: "Hazards",
      icon: <Warning fontSize="small" />,
      description:
        "Display hazard layers including FEMA flood zones, sea level rise projections (passive flooding, highway exposure, erosion, exposure areas), and solar insolation.",
    },
    {
      key: "rasters",
      label: "Rasters",
      icon: <Terrain fontSize="small" />,
      description: "Overlay raster data layers such as terrain and elevation data.",
    },
    {
      key: "HCDP",
      label: "Hawaii Climate Data Portal",
      icon: <CloudQueue fontSize="small" />,
      description:
        "Load Hawaii Climate Data Portal (HCDP) raster datasets. After selecting a dataset, use the HCDP tab on the map legend to choose a specific raster layer to display.",
    },
    {
      key: "analyzer",
      label: "Data Analyzer",
      icon: <BarChart fontSize="small" />,
      description:
        "Explore the distribution of the selected Social Vulnerability Indicator across block groups and filter by value range.",
    },
  ];

  return (
    <Paper className={styles["top-bar"]} elevation={3}>
      {/* Brand */}
      <Box className={styles["top-bar-brand"]}>
        <Typography variant="subtitle1" className={styles["top-bar-title"]}>
          CCSVI
        </Typography>
        <Chip
          label={`${visibleMaps.length}/${mapConfigs.length}`}
          size="small"
          color="primary"
          className={styles["map-count-chip"]}
        />
      </Box>

      <Divider orientation="vertical" flexItem className={styles["bar-divider"]} />

      {/* Nav Buttons */}
      <Box className={styles["top-bar-nav"]}>
        {navItems.map(({ key, label, icon }) => (
          <Button
            key={key}
            className={`${styles["nav-btn"]} ${anchors[key] ? styles["nav-btn--active"] : ""}`}
            onClick={(e) => handleButtonClick(key, e)}
            startIcon={icon}
            endIcon={
              <ExpandMore
                fontSize="small"
                className={anchors[key] ? styles["chevron-open"] : styles["chevron"]}
              />
            }
            size="small"
          >
            {label}
          </Button>
        ))}
      </Box>

      <Divider orientation="vertical" flexItem className={styles["bar-divider"]} />

      {/* Utility Actions */}
      <Box className={styles["top-bar-actions"]}>
        <Tooltip title={isGridView ? "Switch to row view" : "Switch to grid view"}>
          <IconButton onClick={onToggleGridView} size="small" className={styles["reset-btn"]}>
            {isGridView ? <CalendarViewWeek fontSize="small" /> : <GridView fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Take Snapshot">
          <Button
            onClick={handleSnapshot}
            variant="contained"
            startIcon={<Camera fontSize="small" />}
            size="small"
            className={styles["action-btn"]}
          >
            Snapshot
          </Button>
        </Tooltip>
        <Tooltip title="Reset View">
          <IconButton onClick={handleResetView} size="small" className={styles["reset-btn"]}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <MapsMenu
        open={Boolean(anchors.maps)}
        anchorEl={anchors.maps ?? null}
        onClose={() => closeMenu("maps")}
        onInfoClick={(e) => handleInfoClick("maps", e)}
        maxMaps={maxMaps}
      />
      <SviMenu
        open={Boolean(anchors.svi)}
        anchorEl={anchors.svi ?? null}
        onClose={() => closeMenu("svi")}
        onInfoClick={(e) => handleInfoClick("svi", e)}
      />
      <PointsMenu
        open={Boolean(anchors.points)}
        anchorEl={anchors.points ?? null}
        onClose={() => closeMenu("points")}
        onInfoClick={(e) => handleInfoClick("points", e)}
      />
      <LocationsMenu
        open={Boolean(anchors.locations)}
        anchorEl={anchors.locations ?? null}
        onClose={() => closeMenu("locations")}
        onInfoClick={(e) => handleInfoClick("locations", e)}
      />
      <HazardsMenu
        open={Boolean(anchors.hazards)}
        anchorEl={anchors.hazards ?? null}
        onClose={() => closeMenu("hazards")}
        onInfoClick={(e) => handleInfoClick("hazards", e)}
      />
      <RastersMenu
        open={Boolean(anchors.rasters)}
        anchorEl={anchors.rasters ?? null}
        onClose={() => closeMenu("rasters")}
        onInfoClick={(e) => handleInfoClick("rasters", e)}
      />
      <HcdpMenu
        open={Boolean(anchors.HCDP)}
        anchorEl={anchors.HCDP ?? null}
        onClose={() => closeMenu("HCDP")}
        onInfoClick={(e) => handleInfoClick("HCDP", e)}
      />
      <AnalyzerMenu
        open={Boolean(anchors.analyzer)}
        anchorEl={anchors.analyzer ?? null}
        onClose={() => closeMenu("analyzer")}
        onInfoClick={(e) => handleInfoClick("analyzer", e)}
      />
      {/* ── Info Popover ── */}
      <Popover
        open={Boolean(infoAnchor)}
        anchorEl={infoAnchor}
        onClose={handleInfoClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        disableRestoreFocus
      >
        <Box className={styles["info-popover-content"]}>
          <Typography variant="body2">
            {infoKey ? navItems.find((n) => n.key === infoKey)?.description : ""}
          </Typography>
        </Box>
      </Popover>
    </Paper>
  );
};
