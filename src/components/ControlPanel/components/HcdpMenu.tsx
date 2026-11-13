import React from "react";
import { Stack } from "@mui/material";
import { MenuShell, type MenuProps } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { useMenuMap } from "../useMenuMap";
import { useVisibleMaps } from "../../../stores/useMapStore";
import { HCDPLoad } from "../../HCDP/HCDPLoad";

export const HcdpMenu: React.FC<MenuProps> = (props) => {
  const visibleMaps = useVisibleMaps();
  const [resolvedMapId, setHcdpMapId] = useMenuMap(visibleMaps);

  return (
    <MenuShell {...props}>
      <MapTabSelector maps={visibleMaps} selectedMapId={resolvedMapId} onChange={setHcdpMapId} />
      <Stack spacing={1}>{resolvedMapId ? <HCDPLoad mapId={resolvedMapId} /> : null}</Stack>
    </MenuShell>
  );
};
