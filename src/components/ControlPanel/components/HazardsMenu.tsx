import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Collapse,
  FormControlLabel,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import { useMapStore, useHazardLayersStore, useRasterLayersStore } from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import type { HazardLayerConfig, RasterLayerConfig } from "../../../types";
import {
  buildHazardMenuSections,
  hazardMenuGroupExpandKey,
} from "../../../utils/hazardMenuSections";

interface HazardsMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const HazardsMenu: React.FC<HazardsMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);
  const toggleSubLayerVisibility = useHazardLayersStore((s) => s.toggleSubLayerVisibility);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [hazardsMapId, setHazardsMapId] = useState<string>("");
  const resolvedHazardsMapId = useResolvedMapId(hazardsMapId, visibleMaps, primaryMapId);
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback(
    (id: string) => setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  const menuSections = useMemo(
    () => buildHazardMenuSections(hazardLayerConfigs, "hazards"),
    [hazardLayerConfigs],
  );

  const renderHazardParent = (parent: HazardLayerConfig) => {
    const visibleIds = visibleHazardLayerIdsByMap[resolvedHazardsMapId] ?? new Set<string>();
    const hasSubs = Boolean(parent.subLayers?.length);

    return (
      <Box key={parent.id} className={styles["layer-toggle"]}>
        <Box display="flex" alignItems="center">
          <LayerToggleItem
            label={parent.name}
            description={parent.description}
            icon={parent.icon}
            color={parent.color}
            fallbackIcon="FaExclamationTriangle"
            checked={visibleIds.has(parent.id)}
            onToggle={() => toggleHazardLayerVisibility(resolvedHazardsMapId, parent.id)}
          />
          {hasSubs && (
            <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
              {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {hasSubs && (
          <Collapse in={expandedHazards[parent.id]}>
            <Stack spacing={1} className={styles["layer-sub-stack"]}>
              {parent.subLayers!.map((sub) => (
                <LayerToggleItem
                  key={sub.id}
                  label={sub.name}
                  description={sub.description}
                  checked={visibleIds.has(`${parent.id}.${sub.id}`)}
                  indented
                  labelMl={0}
                  onToggle={() =>
                    toggleSubLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
                  }
                />
              ))}
            </Stack>
          </Collapse>
        )}
      </Box>
    );
  };

  const renderRasterParent = (parent: RasterLayerConfig) => {
    const visibleIds = visibleRasterLayerIdsByMap[resolvedHazardsMapId] ?? new Set<string>();
    const hasSubs = Boolean(parent.subLayers?.length);
    const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
    const rasterExpandKey = `raster:${parent.id}`;

    return (
      <Box key={parent.id} className={styles["layer-toggle"]}>
        <Box display="flex" alignItems="center">
          {!hasSubs && (
            <Checkbox
              checked={visibleIds.has(parent.id)}
              onChange={() => toggleRasterLayerVisibility(resolvedHazardsMapId, parent.id)}
              size="small"
            />
          )}
          <Box
            className={`${styles["layer-label"]}${hasSubs ? ` ${styles["layer-label--no-checkbox"]}` : ""}`}
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
            }}
          >
            <span className={styles["layer-icon"]} style={{ color: parent.color }}>
              <ParentIcon size="1rem" />
            </span>
            {parent.description ? (
              <Tooltip title={parent.description} placement="right">
                <span>{parent.name}</span>
              </Tooltip>
            ) : (
              parent.name
            )}
          </Box>
          {hasSubs && (
            <IconButton size="small" onClick={() => toggleExpand(rasterExpandKey)}>
              {expandedHazards[rasterExpandKey] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {hasSubs && (
          <Collapse in={expandedHazards[rasterExpandKey]}>
            <Stack spacing={1} className={styles["layer-sub-stack"]}>
              {parent.subLayers!.map((sub) => (
                <FormControlLabel
                  key={sub.id}
                  className={styles["raster-form-label"]}
                  control={
                    <Checkbox
                      checked={visibleIds.has(`${parent.id}.${sub.id}`)}
                      onChange={() =>
                        toggleSubRasterLayerVisibility(
                          resolvedHazardsMapId,
                          parent.id,
                          sub.id,
                        )
                      }
                      size="small"
                    />
                  }
                  label={
                    sub.description ? (
                      <Tooltip title={sub.description} placement="right">
                        <span>{sub.name}</span>
                      </Tooltip>
                    ) : (
                      sub.name
                    )
                  }
                />
              ))}
            </Stack>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Hazard Layers"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedHazardsMapId}
        onChange={setHazardsMapId}
      />
      {resolvedHazardsMapId && (
        <Stack spacing={1}>
          {menuSections.map((section) => {
            if (section.kind === "layer") return renderHazardParent(section.layer);
            const expandKey = hazardMenuGroupExpandKey(section.label);
            return (
              <LayerToggleGroup
                key={expandKey}
                label={section.label}
                description={section.layers.find((layer) => layer.description)?.description}
                expanded={expandedHazards[expandKey] ?? false}
                onToggleExpand={() => toggleExpand(expandKey)}
                childrenPl={2}
              >
                {section.layers.map(renderHazardParent)}
              </LayerToggleGroup>
            );
          })}
          {rasterLayerConfigs.length > 0 && (
            <LayerToggleGroup
              label="Raster Layers"
              icon="FaMountain"
              color="#6D4C41"
              //move raster layer header without affecting child layers
              className={styles["layer-toggle--raster"]}
              expanded={expandedHazards["raster-group"] ?? false}
              onToggleExpand={() => toggleExpand("raster-group")}
              childrenPl={2}
            >
              {rasterLayerConfigs.map(renderRasterParent)}
            </LayerToggleGroup>
          )}
        </Stack>
      )}
    </MenuShell>
  );
};
