import React from "react";
import { Switch, Checkbox, FormControlLabel, Menu, MenuItem, ListSubheader } from "@mui/material";
import { MapState } from "../../../types";
import {
  BASE_MAP_LABEL_VARIANTS,
  BASE_MAP_OPTIONS,
} from "../../../config/basemaps";

const labelVariantIds = new Set(
  BASE_MAP_LABEL_VARIANTS.flatMap(({ noLabelsId, labelsId }) => [noLabelsId, labelsId]),
);

interface BaseMapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  activeBaseMapId: string;
  updateMap: (mapId: string, updates: Partial<MapState>) => void;
}
// Base map (tile provider) picker for a single map
export const BaseMapMenu: React.FC<BaseMapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  activeBaseMapId,
  updateMap,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Base Map</ListSubheader>
      {BASE_MAP_LABEL_VARIANTS.map(({ label, noLabelsId, labelsId }) => {
        const isVariantSelected = activeBaseMapId === noLabelsId || activeBaseMapId === labelsId;
        const labelsEnabled = activeBaseMapId === labelsId;

        return (
          <MenuItem
            key={noLabelsId}
            selected={isVariantSelected}
            onClick={() => updateMap(mapId, { baseMap: noLabelsId })}
            sx={{ justifyContent: "space-between" }}
          >
            {label}
            <FormControlLabel
              label="Labels"
              onClick={(event) => event.stopPropagation()}
              sx={{ ml: 2, mr: -1 }}
              control={
                <Switch
                  checked={labelsEnabled}
                  size="small"
                  slotProps={{
                    input: { "aria-label": `${label} labels` }
                  }}
                  onChange={(event) =>
                    updateMap(mapId, { baseMap: event.target.checked ? labelsId : noLabelsId })
                  }
                />
              }
            />
          </MenuItem>
        );
      })}
      {BASE_MAP_OPTIONS.filter((opt) => !labelVariantIds.has(opt.id)).map((opt) => (
        <MenuItem
          key={opt.id}
          selected={opt.id === activeBaseMapId}
          onClick={() => updateMap(mapId, { baseMap: opt.id })}
        >
          {opt.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
