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
  Terrain,
  ExpandMore,
  GridView,
  CalendarViewWeek,
  Assessment,
  Factory,
  BarChart,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from "@mui/icons-material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useHCDPStore,
  useFilterStore,
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
import { AnalyzerMenu } from "./components/AnalyzerMenu";

interface IntegratedControlPanelProps {
  maxMaps: number;
  isGridView?: boolean;
  onToggleGridView?: () => void;
  onSnapshot?: () => void | Promise<void>;
}

type PopoverKey = "maps" | "svi" | "points" | "locations" | "hazards" | "HCDP" | "analyzer" | null;

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
  const clearFilter = useFilterStore((s) => s.clearFilter);

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<NonNullable<PopoverKey>, HTMLElement>>>({});
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const [infoKey, setInfoKey] = useState<NonNullable<PopoverKey> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorTrackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, grabOffset: 0 });
  const [scrollIndicator, setScrollIndicator] = useState({
    isOverflowing: false,
    canScrollLeft: false,
    canScrollRight: false,
    thumbWidth: 0,
    thumbOffset: 0,
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

    mapConfigs.forEach((map) => {
      setVisiblePointLayerIds(map.id, []);
      setVisibleHazardLayerIds(map.id, []);
      setVisibleRasterLayerIds(map.id, []);
      clearHCDP(map.id);
    });
    setAnchors({});
  }, [
    resetMapStore,
    clearFilter,
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

  const updateScrollIndicator = useCallback(() => {
    const nav = navRef.current;
    const track = indicatorTrackRef.current;
    if (!nav) return;

    const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const isOverflowing = maxScroll > 1;
    if (!isOverflowing) {
      setScrollIndicator((previous) => ({
        ...previous,
        isOverflowing: false,
        canScrollLeft: false,
        canScrollRight: false,
        thumbWidth: 0,
        thumbOffset: 0,
      }));
      return;
    }

    const trackWidth = track?.clientWidth ?? nav.clientWidth;
    const thumbWidth = Math.max(24, (nav.clientWidth / nav.scrollWidth) * trackWidth);
    const availableTravel = Math.max(0, trackWidth - thumbWidth);
    const thumbOffset = (nav.scrollLeft / maxScroll) * availableTravel;
    setScrollIndicator({
      isOverflowing: true,
      canScrollLeft: nav.scrollLeft > 1,
      canScrollRight: nav.scrollLeft < maxScroll - 1,
      thumbWidth,
      thumbOffset,
    });
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => updateScrollIndicator();
    nav.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollIndicator);
    resizeObserver.observe(nav);
    if (nav.firstElementChild) resizeObserver.observe(nav.firstElementChild);
    window.addEventListener("resize", updateScrollIndicator);
    updateScrollIndicator();

    return () => {
      nav.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollIndicator);
    };
  }, [updateScrollIndicator]);

  useLayoutEffect(() => {
    if (scrollIndicator.isOverflowing) updateScrollIndicator();
  }, [scrollIndicator.isOverflowing, updateScrollIndicator]);

  const scrollNav = useCallback((direction: number) => {
    navRef.current?.scrollBy({ left: direction * 160, behavior: "smooth" });
  }, []);

  const scrollToTrackPosition = useCallback((clientX: number, grabOffset = 0) => {
    const nav = navRef.current;
    const track = indicatorTrackRef.current;
    if (!nav || !track) return;

    const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const thumbWidth = Math.max(24, (nav.clientWidth / nav.scrollWidth) * track.clientWidth);
    const availableTravel = Math.max(0, track.clientWidth - thumbWidth);
    if (maxScroll === 0 || availableTravel === 0) return;

    const trackRect = track.getBoundingClientRect();
    const offset = Math.min(availableTravel, Math.max(0, clientX - trackRect.left - grabOffset));
    nav.scrollLeft = (offset / availableTravel) * maxScroll;
  }, []);

  const handleTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      scrollToTrackPosition(event.clientX);
    },
    [scrollToTrackPosition],
  );

  const handleThumbPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = indicatorTrackRef.current;
      if (!track) return;

      const trackRect = track.getBoundingClientRect();
      dragRef.current = {
        active: true,
        grabOffset: event.clientX - trackRect.left - scrollIndicator.thumbOffset,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [scrollIndicator.thumbOffset],
  );

  const handleThumbPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      scrollToTrackPosition(event.clientX, dragRef.current.grabOffset);
    },
    [scrollToTrackPosition],
  );

  const stopThumbDragging = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    {
      key: "points",
      label: "Critical Infrastructure",
      icon: <LocationOn fontSize="small" />,
      description:
        "Overlay point data for critical infrastructure including hospitals, fire stations, police stations, emergency shelters, schools, and road networks.",
    },
    {
      key: "locations",
      label: "Secondary Environmental Risk Areas",
      icon: <Factory fontSize="small" />,
      description:
        "Show locations with environmental hazards or risk-prone infrastructure that can worsen climate impacts, such as onsite sewage disposal systems.",
    },
    {
      key: "hazards",
      label: "Hazards",
      icon: <Warning fontSize="small" />,
      description:
        "Display hazard layers including FEMA flood zones, sea level rise projections (passive flooding, highway exposure, erosion, exposure areas), solar insolation, storm surge, and landslide data.",
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

      {/* Nav Buttons and horizontal overflow indicator */}
      <Box className={styles["top-bar-nav-container"]}>
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
        {scrollIndicator.isOverflowing && (
          <Box className={styles["scroll-indicator"]} aria-label="Toolbar scroll position">
            <IconButton
              size="small"
              className={styles["scroll-arrow"]}
              onClick={() => scrollNav(-1)}
              disabled={!scrollIndicator.canScrollLeft}
              aria-label="Scroll toolbar left"
            >
              <KeyboardArrowLeft fontSize="small" />
            </IconButton>
            <Box
              className={styles["scroll-track"]}
              ref={indicatorTrackRef}
              onPointerDown={handleTrackPointerDown}
            >
              <Box
                className={styles["scroll-thumb"]}
                onPointerDown={handleThumbPointerDown}
                onPointerMove={handleThumbPointerMove}
                onPointerUp={stopThumbDragging}
                onPointerCancel={stopThumbDragging}
                style={{
                  width: `${scrollIndicator.thumbWidth}px`,
                  transform: `translateX(${scrollIndicator.thumbOffset}px)`,
                }}
              />
            </Box>
            <IconButton
              size="small"
              className={styles["scroll-arrow"]}
              onClick={() => scrollNav(1)}
              disabled={!scrollIndicator.canScrollRight}
              aria-label="Scroll toolbar right"
            >
              <KeyboardArrowRight fontSize="small" />
            </IconButton>
          </Box>
        )}
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
