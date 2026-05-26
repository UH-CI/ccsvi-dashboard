import React, { useMemo, useCallback, useState } from "react";
import {
  Typography,
  Button,
  Paper,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Box,
  Chip,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Menu,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
} from "@mui/material";
import {
  Camera,
  Layers,
  LocationOn,
  Warning,
  Refresh,
  Terrain,
  ExpandMore,
  ExpandLess,
  GridView,
  CalendarViewWeek,
  Assessment,
  Factory,
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useAppStore,
} from "../../stores";
import { SVI_CATEGORIES } from "../../config";
import { SingleMapControls } from "./SingleMapControls";
import styles from "./ControlPanel.module.scss";

interface IntegratedControlPanelProps {
  maxMaps: number;
  isGridView?: boolean;
  onToggleGridView?: () => void;
  onSnapshot?: () => void | Promise<void>;
}

type PopoverKey = "maps" | "svi" | "points" | "locations" | "hazards" | "rasters" | null;

const SCHOOL_IDS = ["preschools", "public_schools", "private_schools"];

const MapTabSelector: React.FC<{
  mapConfigs: { id: string; title?: string }[];
  selectedMapId: string;
  onChange: (id: string) => void;
}> = ({ mapConfigs, selectedMapId, onChange }) => {
  if (mapConfigs.length <= 1) return null;
  return (
    <Box className={styles["map-tab-selector"]}>
      {mapConfigs.map((c) => (
        <button
          key={c.id}
          className={`${styles["map-tab-btn"]} ${selectedMapId === c.id ? styles["map-tab-btn--active"] : ""}`}
          onClick={() => onChange(c.id)}
        >
          {c.title ?? `Map ${c.id}`}
        </button>
      ))}
    </Box>
  );
};

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({
  maxMaps,
  isGridView = true,
  onToggleGridView,
  onSnapshot,
}) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const blockGroupData = useAppStore((state) => state.blockGroupData);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const updateMapConfig = useMapStore((state) => state.updateMapConfig);
const resetMapStore = useMapStore((state) => state.reset);
  const primaryMapId = useMapStore((state) => state.primaryMapId);

  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const pointLayerConfigs = usePointLayerStore((state) => state.pointLayerConfigs);
  const visiblePointLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((state) => state.toggleLayerVisibility);

  const hazardLayerConfigs = useHazardLayersStore((state) => state.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore(
    (state) => state.toggleHazardLayerVisibility,
  );
  const toggleSubLayerVisibility = useHazardLayersStore((state) => state.toggleSubLayerVisibility);

  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<NonNullable<PopoverKey>, HTMLElement>>>({});
  const [expandedSvi, setExpandedSvi] = useState<Record<string, boolean>>({});
  const [expandedPoints, setExpandedPoints] = useState<Record<string, boolean>>({});
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
  const [mapsMapId, setMapsMapId] = useState<string>("");
  const [sviMapId, setSviMapId] = useState<string>("");
  const [pointsMapId, setPointsMapId] = useState<string>("");
  const [locationsMapId, setLocationsMapId] = useState<string>("");
  const [hazardsMapId, setHazardsMapId] = useState<string>("");
  const [rastersMapId, setRastersMapId] = useState<string>("");

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

  // Resolve each panel's selected map against the live map list.
  // If the stored preference no longer exists, fall back to primaryMapId then first map.
  const resolvedMapsMapId =
    mapConfigs.find((c) => c.id === mapsMapId)?.id ??
    mapConfigs.find((c) => c.id === primaryMapId)?.id ??
    mapConfigs[0]?.id ?? "";
  const resolvedSviMapId =
    visibleMaps.find((c) => c.id === sviMapId)?.id ??
    visibleMaps.find((c) => c.id === primaryMapId)?.id ??
    visibleMaps[0]?.id ?? "";
  const resolvedPointsMapId =
    visibleMaps.find((c) => c.id === pointsMapId)?.id ??
    visibleMaps.find((c) => c.id === primaryMapId)?.id ??
    visibleMaps[0]?.id ?? "";
  const resolvedLocationsMapId =
    visibleMaps.find((c) => c.id === locationsMapId)?.id ??
    visibleMaps.find((c) => c.id === primaryMapId)?.id ??
    visibleMaps[0]?.id ?? "";
  const resolvedHazardsMapId =
    visibleMaps.find((c) => c.id === hazardsMapId)?.id ??
    visibleMaps.find((c) => c.id === primaryMapId)?.id ??
    visibleMaps[0]?.id ?? "";
  const resolvedRastersMapId =
    visibleMaps.find((c) => c.id === rastersMapId)?.id ??
    visibleMaps.find((c) => c.id === primaryMapId)?.id ??
    visibleMaps[0]?.id ?? "";

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

  const handleRemoveMap = useCallback(
    (mapId: string) => {
      setVisiblePointLayerIds(mapId, []);
      setVisibleRasterLayerIds(mapId, []);
      setVisibleHazardLayerIds(mapId, []);
      removeMap(mapId);
    },
    [removeMap, setVisiblePointLayerIds, setVisibleRasterLayerIds, setVisibleHazardLayerIds],
  );

  const handleResetView = useCallback(() => {
    resetMapStore();
    mapConfigs.forEach((map) => {
      setVisiblePointLayerIds(map.id, []);
      setVisibleHazardLayerIds(map.id, []);
      setVisibleRasterLayerIds(map.id, []);
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

  const toggleExpandSvi = useCallback((id: string) => {
    setExpandedSvi((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpandRaster = useCallback((id: string) => {
    setExpandedRasters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const navItems: { key: NonNullable<PopoverKey>; label: string; icon: React.ReactNode }[] = [
    { key: "maps", label: "Maps", icon: <Layers fontSize="small" /> },
    { key: "svi", label: "Social Vulnerability Indicators", icon: <Assessment fontSize="small" /> },
    { key: "points", label: "Critical Infrastructure", icon: <LocationOn fontSize="small" /> },
    { key: "locations", label: "Locations of Enhanced Exposure", icon: <Factory fontSize="small" /> },
    { key: "hazards", label: "Hazards", icon: <Warning fontSize="small" /> },
    { key: "rasters", label: "Rasters", icon: <Terrain fontSize="small" /> },
  ];

  const menuProps = {
    anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
    transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
    disableAutoFocus: true,
    disableEnforceFocus: true,
    disableRestoreFocus: true,
    // Keep menu open when interacting with nested MUI components
    keepMounted: false,
    PaperProps: {
      className: styles["menu-paper"],
    },
    MenuListProps: {
      className: styles["menu-list"],
    },
  };

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

      {/* ── Maps Menu ── */}
      <Menu
        open={Boolean(anchors.maps)}
        anchorEl={anchors.maps}
        onClose={() => closeMenu("maps")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Map Management
          </Typography>
          {canAddMap && (
            <Button
              variant="outlined"
              size="small"
              onClick={addMap}
              startIcon={<Layers />}
              fullWidth
              className={styles["popover-add-btn"]}
            >
              Add Map
            </Button>
          )}
          <MapTabSelector
            mapConfigs={mapConfigs}
            selectedMapId={resolvedMapsMapId}
            onChange={setMapsMapId}
          />
          {resolvedMapsMapId && (
            <SingleMapControls
              key={resolvedMapsMapId}
              mapId={resolvedMapsMapId}
              canRemoveMap={canRemoveMap}
              onRemove={handleRemoveMap}
              section="management"
            />
          )}
        </Box>
      </Menu>

      {/* ── Social Vulnerability Indicators Menu ── */}
      <Menu
        open={Boolean(anchors.svi)}
        anchorEl={anchors.svi}
        onClose={() => closeMenu("svi")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Social Vulnerability Indicators
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={resolvedSviMapId}
            onChange={setSviMapId}
          />
          {resolvedSviMapId && (() => {
            const sviConfig = mapConfigs.find((c) => c.id === resolvedSviMapId);
            const activeSviCategoryId = SVI_CATEGORIES.find((cat) =>
              cat.indicators.some(
                (ind) => ind.dataset === sviConfig?.dataset && ind.metric === sviConfig?.metric,
              ),
            )?.id;
            return (
              <Stack spacing={1}>
                {SVI_CATEGORIES.map((category) => {
                  const isExpanded = expandedSvi[category.id] ?? category.id === activeSviCategoryId;
                  return (
                  <Box key={category.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      <Typography
                        className={styles["layer-label"]}
                        sx={{ display: "flex", alignItems: "center", flexGrow: 1, ml: "21px" }}
                      >
                        {category.label}
                      </Typography>
                      <IconButton size="small" onClick={() => toggleExpandSvi(category.id)}>
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    <Collapse in={isExpanded}>
                      <Stack spacing={1} sx={{ pl: 3 }}>
                        {category.indicators.map((indicator) => {
                          const isSelected =
                            sviConfig?.dataset === indicator.dataset &&
                            sviConfig?.metric === indicator.metric;
                          return (
                            <FormControlLabel
                              key={`${indicator.dataset}:${indicator.metric}`}
                              sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                              control={
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() =>
                                    updateMapConfig(resolvedSviMapId, {
                                      dataset: isSelected ? "" : indicator.dataset,
                                      metric: isSelected ? "" : indicator.metric,
                                      dataset2: undefined,
                                      metric2: undefined,
                                    })
                                  }
                                  size="small"
                                />
                              }
                              label={indicator.label}
                            />
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </Box>
                  );
                })}
                {sviConfig?.dataset && sviConfig?.metric && (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Compare with</InputLabel>
                    <Select
                      value={sviConfig.metric2 ? `${sviConfig.dataset2 ?? sviConfig.dataset}::${sviConfig.metric2}` : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          updateMapConfig(resolvedSviMapId, { metric2: undefined, dataset2: undefined });
                        } else {
                          const sepIdx = val.indexOf("::");
                          const ds = val.slice(0, sepIdx);
                          const metric = val.slice(sepIdx + 2);
                          updateMapConfig(resolvedSviMapId, {
                            metric2: metric,
                            dataset2: ds !== sviConfig.dataset ? ds : undefined,
                          });
                        }
                      }}
                      label="Compare with"
                    >
                      <MenuItem value=""><em>None (univariate)</em></MenuItem>
                      {blockGroupData && (() => {
                        const primaryIsHawaiian = sviConfig?.dataset
                          ? (blockGroupData[sviConfig.dataset]?.hawaiianHomelands ?? false)
                          : false;
                        return Object.entries(blockGroupData)
                          .filter(([, dsObj]) => (dsObj.hawaiianHomelands ?? false) === primaryIsHawaiian)
                          .map(([dsId, dsObj]) => [
                            <ListSubheader key={`hdr-${dsId}`}>
                              {dsObj.metricLabel || dsId.replace(/_/g, " ")}
                            </ListSubheader>,
                            ...Object.keys(dsObj.columnThresholds || {})
                              .filter((m) => !(dsId === sviConfig.dataset && m === sviConfig.metric))
                              .map((metricName) => (
                                <MenuItem key={`${dsId}::${metricName}`} value={`${dsId}::${metricName}`}>
                                  {metricName}
                                </MenuItem>
                              )),
                          ]);
                      })()}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            );
          })()}
        </Box>
      </Menu>

      {/*── Points Menu ── */}
      <Menu
        open={Boolean(anchors.points)}
        anchorEl={anchors.points}
        onClose={() => closeMenu("points")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Critical Infrastructure
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={resolvedPointsMapId}
            onChange={setPointsMapId}
          />
          {resolvedPointsMapId && (() => {
            const visibleIds = visiblePointLayerIdsByMap[resolvedPointsMapId];
            const visibleSchoolCount = SCHOOL_IDS.filter((id) => visibleIds?.has(id)).length;
            const allSchoolsVisible = visibleSchoolCount === SCHOOL_IDS.length;
            const someSchoolsVisible = visibleSchoolCount > 0 && !allSchoolsVisible;

            const handleToggleAllSchools = () => {
              if (allSchoolsVisible) {
                SCHOOL_IDS.filter((id) => visibleIds?.has(id)).forEach((id) =>
                  togglePointLayerVisibility(resolvedPointsMapId, id),
                );
              } else {
                SCHOOL_IDS.filter((id) => !visibleIds?.has(id)).forEach((id) =>
                  togglePointLayerVisibility(resolvedPointsMapId, id),
                );
              }
            };

            return (
              <Stack spacing={1}>
                {pointLayerConfigs
                  .filter((l) => !SCHOOL_IDS.includes(l.id) && l.id !== "sewage")
                  .map((layer) => {
                    const IconComponent =
                      FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                    const isVisible = visibleIds?.has(layer.id) ?? false;
                    return (
                      <FormControlLabel
                        key={layer.id}
                        control={
                          <Checkbox
                            checked={isVisible}
                            onChange={() =>
                              togglePointLayerVisibility(resolvedPointsMapId, layer.id)
                            }
                            size="small"
                          />
                        }
                        label={
                          <Box className={styles["layer-label"]}>
                            <span className={styles["layer-icon"]} style={{ color: layer.color }}>
                              <IconComponent size="1rem" />
                            </span>
                            {layer.name}
                          </Box>
                        }
                      />
                    );
                  })}

                {/* Sidewalks and Paths (from hazard layers) */}
                {(() => {
                  const layer = hazardLayerConfigs.find((l) => l.id === "sidewalks_and_paths");
                  if (!layer) return null;
                  const Icon = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                  const isVisible =
                    visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(layer.id) ?? false;
                  return (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isVisible}
                          onChange={() =>
                            toggleHazardLayerVisibility(resolvedPointsMapId, layer.id)
                          }
                          size="small"
                        />
                      }
                      label={
                        <Box className={styles["layer-label"]}>
                          <span className={styles["layer-icon"]} style={{ color: layer.color }}>
                            <Icon size="1rem" />
                          </span>
                          {layer.name}
                        </Box>
                      }
                    />
                  );
                })()}

                {/* State Roads with island sub-layers */}
                {(() => {
                  const roadsLayer = hazardLayerConfigs.find((l) => l.id === "state_roads");
                  if (!roadsLayer?.subLayers) return null;
                  const RoadsIcon =
                    FaIcons[roadsLayer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                  const visibleSubCount = roadsLayer.subLayers.filter((sub) =>
                    visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(`state_roads.${sub.id}`)
                  ).length;
                  const allSubVisible = visibleSubCount === roadsLayer.subLayers.length;
                  const someSubVisible = visibleSubCount > 0 && !allSubVisible;
                  return (
                    <Box className={styles["layer-toggle"]}>
                      <Box display="flex" alignItems="center">
                        <Checkbox
                          checked={allSubVisible}
                          indeterminate={someSubVisible}
                          onChange={() =>
                            toggleHazardLayerVisibility(resolvedPointsMapId, roadsLayer.id)
                          }
                          size="small"
                        />
                        <Typography
                          className={styles["layer-label"]}
                          sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}
                        >
                          <span
                            className={styles["layer-icon"]}
                            style={{ color: roadsLayer.color }}
                          >
                            <RoadsIcon size="1rem" />
                          </span>
                          {roadsLayer.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedPoints((prev) => ({
                              ...prev,
                              state_roads: !prev.state_roads,
                            }))
                          }
                        >
                          {expandedPoints.state_roads ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedPoints.state_roads}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {roadsLayer.subLayers.map((sub) => {
                            const compositeId = `state_roads.${sub.id}`;
                            const isSubVisible =
                              visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(compositeId) ??
                              false;
                            return (
                              <FormControlLabel
                                key={sub.id}
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubLayerVisibility(
                                        resolvedPointsMapId,
                                        roadsLayer.id,
                                        sub.id,
                                      )
                                    }
                                    size="small"
                                  />
                                }
                                label={sub.name}
                              />
                            );
                          })}
                        </Stack>
                      </Collapse>
                    </Box>
                  );
                })()}

                {/* Schools group */}
                <Box className={styles["layer-toggle"]}>
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      checked={allSchoolsVisible}
                      indeterminate={someSchoolsVisible}
                      onChange={handleToggleAllSchools}
                      size="small"
                    />
                    <Typography
                      className={styles["layer-label"]}
                      sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}
                    >
                      Schools
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setExpandedPoints((prev) => ({ ...prev, schools: !prev.schools }))
                      }
                    >
                      {expandedPoints.schools ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedPoints.schools}>
                    <Stack spacing={1} sx={{ pl: 3 }}>
                      {pointLayerConfigs
                        .filter((l) => SCHOOL_IDS.includes(l.id))
                        .map((layer) => {
                          const IconComponent =
                            FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                          const isVisible = visibleIds?.has(layer.id) ?? false;
                          return (
                            <FormControlLabel
                              key={layer.id}
                              sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                              control={
                                <Checkbox
                                  checked={isVisible}
                                  onChange={() =>
                                    togglePointLayerVisibility(resolvedPointsMapId, layer.id)
                                  }
                                  size="small"
                                />
                              }
                              label={
                                <Box className={styles["layer-label"]}>
                                  <span
                                    className={styles["layer-icon"]}
                                    style={{ color: layer.color }}
                                  >
                                    <IconComponent size="1rem" />
                                  </span>
                                  {layer.name}
                                </Box>
                              }
                            />
                          );
                        })}
                    </Stack>
                  </Collapse>
                </Box>
              </Stack>
            );
          })()}
        </Box>
      </Menu>

      {/* ── Locations of Enhanced Exposure Menu ── */}
      <Menu
        open={Boolean(anchors.locations)}
        anchorEl={anchors.locations}
        onClose={() => closeMenu("locations")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Locations of Enhanced Exposure
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={resolvedLocationsMapId}
            onChange={setLocationsMapId}
          />
          {resolvedLocationsMapId && (
            <Stack spacing={1}>
              {pointLayerConfigs
                .filter((l) => l.id === "sewage")
                .map((layer) => {
                  const IconComponent =
                    FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                  const isVisible =
                    visiblePointLayerIdsByMap[resolvedLocationsMapId]?.has(layer.id) ?? false;
                  return (
                    <FormControlLabel
                      key={layer.id}
                      control={
                        <Checkbox
                          checked={isVisible}
                          onChange={() =>
                            togglePointLayerVisibility(resolvedLocationsMapId, layer.id)
                          }
                          size="small"
                        />
                      }
                      label={
                        <Box className={styles["layer-label"]}>
                          <span className={styles["layer-icon"]} style={{ color: layer.color }}>
                            <IconComponent size="1rem" />
                          </span>
                          {layer.name}
                        </Box>
                      }
                    />
                  );
                })}
            </Stack>
          )}
        </Box>
      </Menu>

      {/* ── Hazards Menu ── */}
      <Menu
        open={Boolean(anchors.hazards)}
        anchorEl={anchors.hazards}
        onClose={() => closeMenu("hazards")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Hazard Layers
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={resolvedHazardsMapId}
            onChange={setHazardsMapId}
          />
          {resolvedHazardsMapId && (() => {
            const renderHazardParent = (parent: (typeof hazardLayerConfigs)[0]) => {
              const ParentIcon =
                FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaExclamationTriangle;
              const isParentVisible =
                visibleHazardLayerIdsByMap[resolvedHazardsMapId]?.has(parent.id) ?? false;
              return (
                <Box key={parent.id} className={styles["layer-toggle"]}>
                  <Box display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isParentVisible}
                          onChange={() => toggleHazardLayerVisibility(resolvedHazardsMapId, parent.id)}
                          size="small"
                        />
                      }
                      label={
                        <Box className={styles["layer-label"]}>
                          <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                            <ParentIcon size="1rem" />
                          </span>
                          {parent.name}
                        </Box>
                      }
                    />
                    {(parent.subLayers ?? []).length > 0 && (
                      <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
                        {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    )}
                  </Box>
                  {parent.subLayers && parent.subLayers.length > 0 && (
                    <Collapse in={expandedHazards[parent.id]}>
                      <Stack spacing={1} sx={{ pl: 3 }}>
                        {parent.subLayers.map((sub) => {
                          const compositeId = `${parent.id}.${sub.id}`;
                          const isSubVisible =
                            visibleHazardLayerIdsByMap[resolvedHazardsMapId]?.has(compositeId) ?? false;
                          return (
                            <FormControlLabel
                              key={sub.id}
                              sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0 } }}
                              control={
                                <Checkbox
                                  checked={isSubVisible}
                                  onChange={() =>
                                    toggleSubLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
                                  }
                                  size="small"
                                />
                              }
                              label={sub.name}
                            />
                          );
                        })}
                      </Stack>
                    </Collapse>
                  )}
                </Box>
              );
            };

            const floodingLayer = hazardLayerConfigs.find((l) => l.id === "flood_hazard");
            const slrLayers = hazardLayerConfigs.filter((l) =>
              ["passive_flood", "potential_flood_highways", "erosion", "exposure_area"].includes(l.id),
            );
            const solarInsolationLayer = hazardLayerConfigs.find((l) => l.id === "solar_insolation");

            return (
              <Stack spacing={1}>
                {floodingLayer && renderHazardParent(floodingLayer)}

                <Box className={styles["layer-toggle"]}>
                  <Box display="flex" alignItems="center">
                    <Typography
                      className={styles["layer-label"]}
                      sx={{ display: "flex", alignItems: "center", flexGrow: 1, ml: "21px" }}
                    >
                      Sea Level Rise
                    </Typography>
                    <IconButton size="small" onClick={() => toggleExpand("__slr__")}>
                      {expandedHazards["__slr__"] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedHazards["__slr__"]}>
                    <Stack spacing={1} sx={{ pl: 2 }}>
                      {slrLayers.map(renderHazardParent)}
                    </Stack>
                  </Collapse>
                </Box>

                {solarInsolationLayer && renderHazardParent(solarInsolationLayer)}
              </Stack>
            );
          })()}
        </Box>
      </Menu>

      {/* ── Terrain Menu ── */}
      <Menu
        open={Boolean(anchors.rasters)}
        anchorEl={anchors.rasters}
        onClose={() => closeMenu("rasters")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Terrain / Rasters
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={resolvedRastersMapId}
            onChange={setRastersMapId}
          />
          {resolvedRastersMapId && (
            <Stack spacing={1}>
              {rasterLayerConfigs.map((parent) => {
                const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
                const hasChildren = !!parent.subLayers?.length;
                const visibleRasterIdsForMap =
                  visibleRasterLayerIdsByMap[resolvedRastersMapId] ?? new Set<string>();
                const isParentVisible = visibleRasterIdsForMap.has(parent.id);
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      {!hasChildren && (
                        <Checkbox
                          checked={isParentVisible}
                          onChange={() => toggleRasterLayerVisibility(resolvedRastersMapId, parent.id)}
                          size="small"
                        />
                      )}
                      <Typography
                        className={styles["layer-label"]}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexGrow: 1,
                          ml: hasChildren ? "21px" : 0,
                        }}
                      >
                        <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                          <ParentIcon size="1rem" />
                        </span>
                        {parent.name}
                      </Typography>
                      {hasChildren && (
                        <IconButton size="small" onClick={() => toggleExpandRaster(parent.id)}>
                          {expandedRasters[parent.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                    {hasChildren && (
                      <Collapse in={expandedRasters[parent.id]}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {parent.subLayers!.map((sub) => {
                            const compositeId = `${parent.id}.${sub.id}`;
                            const isSubVisible = visibleRasterIdsForMap.has(compositeId);
                            return (
                              <FormControlLabel
                                key={sub.id}
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubRasterLayerVisibility(
                                        resolvedRastersMapId,
                                        parent.id,
                                        sub.id,
                                      )
                                    }
                                    size="small"
                                  />
                                }
                                label={sub.name}
                              />
                            );
                          })}
                        </Stack>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Menu>
    </Paper>
  );
};
