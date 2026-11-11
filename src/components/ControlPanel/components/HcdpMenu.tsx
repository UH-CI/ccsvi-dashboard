import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { useMapStore } from "../../../stores";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import { HCDPLoad } from "../../HCDP";

interface HcdpMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const HcdpMenu: React.FC<HcdpMenuProps> = ({ open, anchorEl, onClose, onInfoClick }) => {
  const maps = useMapStore((s) => s.maps);
  const primaryMapId = useMapStore((s) => s.primaryMapId);

  const visibleMaps = useMemo(() => maps.filter((c) => c.visible), [maps]);
  const [hcdpMapId, setHcdpMapId] = useState<string>("");
  const resolvedMapId = useResolvedMapId(hcdpMapId, visibleMaps, primaryMapId);

  return (
    <MenuShell open={open} anchorEl={anchorEl} onClose={onClose} title="HCDP" onInfoClick={onInfoClick}>
      <MapTabSelector maps={visibleMaps} selectedMapId={resolvedMapId} onChange={setHcdpMapId} />
      <Stack spacing={1}>{resolvedMapId ? <HCDPLoad mapId={resolvedMapId} /> : null}</Stack>
    </MenuShell>
  );
};

export default HcdpMenu;
