import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Typography, Button, Paper, Divider, Box, Chip, Tooltip, IconButton } from "@mui/material";
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
  MenuBook,
} from "@mui/icons-material";
import { useMapStore, useVisibleMaps } from "../../stores/useMapStore";
import styles from "./ControlPanel.module.scss";
import type { MenuProps } from "./components/MenuShell";
import { MapsMenu } from "./components/MapsMenu";
import { SviMenu } from "./components/SviMenu";
import { LayerMenu } from "./components/LayerMenu";
import { HcdpMenu } from "./components/HcdpMenu";
import { AnalyzerMenu } from "./components/AnalyzerMenu";
import { ErrorToast } from "../ErrorToast/ErrorToast";
import { CitationsDialog } from "../Citations/CitationsDialog";
import { LAYER_MENUS } from "../../utils/layerMenus";
import type { LayerMenuId } from "../../utils/layerMenus";

interface ControlPanelProps {
  isGridView?: boolean;
  onToggleGridView?: () => void;
  onSnapshot?: () => void | Promise<void>;
}

const LAYER_MENU_ICONS: Record<LayerMenuId, React.ReactNode> = {
  criticalInfrastructure: <LocationOn fontSize="small" />,
  locations: <Factory fontSize="small" />,
  hazards: <Warning fontSize="small" />,
};

// One top-bar button and its menu: the button's text and icon, the menu's title and "About" text
interface NavMenu {
  key: string;
  label: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  Menu: React.FC<MenuProps>;
}

// The top bar's menus, in button order
const NAV_MENUS: NavMenu[] = [
  {
    key: "maps",
    label: "Maps",
    title: "Map Management",
    icon: <Layers fontSize="small" />,
    description:
      "Add, remove, and configure map panels. Adjust per-map settings such as title and visibility.",
    Menu: MapsMenu,
  },
  {
    key: "svi",
    label: "Community Characteristics",
    title: "Community Characteristics",
    icon: <Assessment fontSize="small" />,
    description:
      "Select community characteristics to visualize as a choropleth layer. Indicators are grouped by category and can be compared bivariately using the Compare with selector.",
    Menu: SviMenu,
  },
  ...LAYER_MENUS.map((menu) => ({
    key: menu.id,
    label: menu.title,
    title: menu.popupTitle ?? menu.title,
    icon: LAYER_MENU_ICONS[menu.id],
    description: menu.description,
    Menu: (props: MenuProps) => <LayerMenu menu={menu} {...props} />,
  })),
  {
    key: "HCDP",
    label: "Hawaiʻi Climate Data Portal",
    title: "HCDP",
    icon: <CloudQueue fontSize="small" />,
    description:
      "Load Hawaiʻi Climate Data Portal (HCDP) raster datasets. After selecting a dataset, use the HCDP tab on the map legend to choose a specific raster layer to display.",
    Menu: HcdpMenu,
  },
  {
    key: "analyzer",
    label: "Data Analyzer",
    title: "Data Analyzer",
    icon: <BarChart fontSize="small" />,
    description:
      "Explore the distribution of the selected community characteristic across block groups, compare it with a second characteristic, and filter the map by value range and by the layers currently shown.",
    Menu: AnalyzerMenu,
  },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isGridView = true,
  onToggleGridView,
  onSnapshot,
}) => {
  const maps = useMapStore((state) => state.maps);
  const resetMapStore = useMapStore((state) => state.reset);

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<string, HTMLElement>>>({});
  const [citationsOpen, setCitationsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const visibleMaps = useVisibleMaps();

  const openMenu = useCallback((key: string, el: HTMLElement) => {
    setAnchors((prev) => {
      // The Analyzer panel is persistent, stays open while other menus are used
      if (key === "analyzer") return { ...prev, analyzer: el };
      const next: Partial<Record<string, HTMLElement>> = {};
      if (prev.analyzer) next.analyzer = prev.analyzer;
      next[key] = el;
      return next;
    });
  }, []);

  const closeMenu = useCallback((key: string) => {
    setAnchors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleButtonClick = useCallback(
    (key: string, e: React.MouseEvent<HTMLElement>) => {
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
    setAnchors({});
  }, [resetMapStore]);

  const handleSnapshot = useCallback(() => {
    setAnchors({});
    void onSnapshot?.();
  }, [onSnapshot]);

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

  const handleNavWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    const nav = navRef.current;
    if (!nav) return;

    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const nextScroll = Math.max(0, Math.min(maxScroll, nav.scrollLeft + event.deltaY));
    if (nextScroll === nav.scrollLeft) return;

    event.preventDefault();
    nav.scrollLeft = nextScroll;
  }, []);

  return (
    <Paper className={styles["top-bar"]} elevation={3}>
      {/* Brand */}
      <Box className={styles["top-bar-brand"]}>
        <Typography variant="subtitle1" className={styles["top-bar-title"]}>
          CCSVI
        </Typography>
        <Chip
          label={`${visibleMaps.length}/${maps.length}`}
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
          <Box className={styles["top-bar-nav"]} ref={navRef} onWheel={handleNavWheel}>
            {NAV_MENUS.map(({ key, label, icon }) => (
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
            <Button
              className={`${styles["nav-btn"]} ${citationsOpen ? styles["nav-btn--active"] : ""}`}
              onClick={() => setCitationsOpen(true)}
              startIcon={<MenuBook fontSize="small" />}
              size="small"
            >
              Citations
            </Button>
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

      {NAV_MENUS.map(({ key, title, description, Menu }) => (
        <Menu
          key={key}
          title={title}
          description={description}
          open={Boolean(anchors[key])}
          anchorEl={anchors[key] ?? null}
          onClose={() => closeMenu(key)}
        />
      ))}
      <ErrorToast />
      <CitationsDialog open={citationsOpen} onClose={() => setCitationsOpen(false)} />
    </Paper>
  );
};
