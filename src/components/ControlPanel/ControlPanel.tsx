import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  ExpandMore,
  GridView,
  CalendarViewWeek,
  Assessment,
  Factory,
  BarChart,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from "@mui/icons-material";
import { useMapStore, useFilterStore } from "../../stores";
import styles from "./ControlPanel.module.scss";
import { MapsMenu } from "./components/MapsMenu";
import { SviMenu } from "./components/SviMenu";
import { LayerMenu } from "./components/LayerMenu";
import { HcdpMenu } from "./components/HcdpMenu";
import { AnalyzerMenu } from "./components/AnalyzerMenu";
import { FilterErrorToast } from "../DataAnalyzerMenu/components/FilterErrorToast";
import { LAYER_MENUS } from "../../config/layerMenus";
import type { LayerMenuId } from "../../config/layerMenus";

interface IntegratedControlPanelProps {
  isGridView?: boolean;
  onToggleGridView?: () => void;
  onSnapshot?: () => void | Promise<void>;
}

type PopoverKey = "maps" | "svi" | LayerMenuId | "HCDP" | "analyzer" | null;

const LAYER_MENU_ICONS: Record<LayerMenuId, React.ReactNode> = {
  criticalInfrastructure: <LocationOn fontSize="small" />,
  locations: <Factory fontSize="small" />,
  hazards: <Warning fontSize="small" />,
};

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({
  isGridView = true,
  onToggleGridView,
  onSnapshot,
}) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const resetMapStore = useMapStore((state) => state.reset);
  const clearFilter = useFilterStore((s) => s.clearFilter);

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<NonNullable<PopoverKey>, HTMLElement>>>({});
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const [infoKey, setInfoKey] = useState<NonNullable<PopoverKey> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);

  const openMenu = useCallback((key: NonNullable<PopoverKey>, el: HTMLElement) => {
    setAnchors((prev) => {
      // The Analyzer panel is persistent, stays open while other menus are used
      if (key === "analyzer") return { ...prev, analyzer: el };
      const next: Partial<Record<NonNullable<PopoverKey>, HTMLElement>> = {};
      if (prev.analyzer) next.analyzer = prev.analyzer;
      next[key] = el;
      return next;
    });
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
    clearFilter();
    setAnchors({});
  }, [resetMapStore, clearFilter]);

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

  const updateScrollState = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const nextState = {
      canScrollLeft: nav.scrollLeft > 1,
      canScrollRight: nav.scrollLeft < maxScroll - 1,
    };
    setScrollState((previous) =>
      previous.canScrollLeft === nextState.canScrollLeft &&
      previous.canScrollRight === nextState.canScrollRight
        ? previous
        : nextState,
    );
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => updateScrollState();
    nav.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(nav);
    if (nav.firstElementChild) resizeObserver.observe(nav.firstElementChild);
    updateScrollState();

    return () => {
      nav.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scrollNav = useCallback((direction: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;

    nav.scrollBy({
      left: direction * Math.max(160, nav.clientWidth * 0.8),
      behavior: "smooth",
    });
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
        "Select social vulnerability indicators to visualize as a choropleth layer. Indicators are grouped by category and can be compared bivariately using the Compare with selector.",
    },
    ...LAYER_MENUS.map((menu) => ({
      key: menu.id,
      label: menu.title,
      icon: LAYER_MENU_ICONS[menu.id],
      description: menu.description,
    })),
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
        "Displays the mean/ median value of the selected vulnerability indicator for areas where all chosen layers overlap.",
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

      {/* Nav Buttons and horizontal overflow controls */}
      <Box
        className={`${styles["top-bar-nav-container"]} ${
          scrollState.canScrollLeft ? styles["top-bar-nav-container--left"] : ""
        } ${scrollState.canScrollRight ? styles["top-bar-nav-container--right"] : ""}`}
      >
        <IconButton
          size="small"
          className={`${styles["scroll-arrow"]} ${
            !scrollState.canScrollLeft ? styles["scroll-arrow--hidden"] : ""
          }`}
          onClick={() => scrollNav(-1)}
          disabled={!scrollState.canScrollLeft}
          aria-label="Scroll toolbar left"
        >
          <KeyboardArrowLeft fontSize="small" />
        </IconButton>
        <Box className={styles["top-bar-nav-viewport"]}>
          <Box className={styles["top-bar-nav"]} ref={navRef}>
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
        </Box>
        <IconButton
          size="small"
          className={`${styles["scroll-arrow"]} ${
            !scrollState.canScrollRight ? styles["scroll-arrow--hidden"] : ""
          }`}
          onClick={() => scrollNav(1)}
          disabled={!scrollState.canScrollRight}
          aria-label="Scroll toolbar right"
        >
          <KeyboardArrowRight fontSize="small" />
        </IconButton>
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
      />
      <SviMenu
        open={Boolean(anchors.svi)}
        anchorEl={anchors.svi ?? null}
        onClose={() => closeMenu("svi")}
        onInfoClick={(e) => handleInfoClick("svi", e)}
      />
      {LAYER_MENUS.map((menu) => (
        <LayerMenu
          key={menu.id}
          menu={menu}
          open={Boolean(anchors[menu.id])}
          anchorEl={anchors[menu.id] ?? null}
          onClose={() => closeMenu(menu.id)}
          onInfoClick={(e) => handleInfoClick(menu.id, e)}
        />
      ))}
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
      <FilterErrorToast />
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
