import { Box, Typography } from "@mui/material";
import * as FaIcons from "react-icons/fa";
import type { VisibleLeaf, VisibleNode, VisibleParent } from "../../../utils/layerMenus";

interface LayerMenuSectionProps {
  title: string;
  nodes: VisibleNode[];
}

const FALLBACK_ICONS: Record<VisibleLeaf["kind"], keyof typeof FaIcons> = {
  point: "FaCircle",
  shape: "FaExclamationTriangle",
  raster: "FaMap",
};

const SPAN_BOTH_COLUMNS = { gridColumn: "1 / -1" };

function IconLabel({
  label,
  icon,
  color,
  fallbackIcon,
  bold = false,
}: {
  label: string;
  icon?: string;
  color?: string;
  fallbackIcon: keyof typeof FaIcons;
  bold?: boolean;
}) {
  const Icon = (icon && FaIcons[icon as keyof typeof FaIcons]) || FaIcons[fallbackIcon];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
      <Box component="span" sx={{ display: "flex", flex: "none", color }}>
        <Icon size="0.875rem" />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 500 }}>
        {label}
      </Typography>
    </Box>
  );
}

function TwoColumns({
  children,
  indented = false,
}: {
  children: React.ReactNode;
  indented?: boolean;
}) {
  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1, pl: indented ? 2 : 0 }}
    >
      {children}
    </Box>
  );
}

function ParentRows({ parent }: { parent: VisibleParent }) {
  return (
    <Box sx={SPAN_BOTH_COLUMNS}>
      <IconLabel
        label={parent.label}
        icon={parent.icon}
        color={parent.color}
        fallbackIcon={FALLBACK_ICONS[parent.layerKind]}
      />
      <TwoColumns indented>
        {parent.subLayers.map((sub) => (
          <Typography key={sub.key} variant="body2" sx={{ mt: 0.25 }}>
            {sub.label}
          </Typography>
        ))}
      </TwoColumns>
    </Box>
  );
}

function NodeRows({ node }: { node: VisibleNode }) {
  if (node.kind === "parent") return <ParentRows parent={node} />;
  if (node.kind === "group") {
    return (
      <Box sx={SPAN_BOTH_COLUMNS}>
        <IconLabel
          label={node.label}
          icon={node.icon}
          color={node.color}
          fallbackIcon="FaCircle"
          bold
        />
        <TwoColumns indented>
          {node.children.map((child) => (
            <NodeRows key={child.key} node={child} />
          ))}
        </TwoColumns>
      </Box>
    );
  }
  return (
    <IconLabel
      label={node.label}
      icon={node.icon}
      color={node.color}
      fallbackIcon={FALLBACK_ICONS[node.kind]}
    />
  );
}

// The visible layers of one control panel menu, grouped as the menu groups them
export const LayerMenuSection: React.FC<LayerMenuSectionProps> = ({ title, nodes }) => (
  <Box>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
    >
      {title}
    </Typography>
    <Box sx={{ mt: 0.5 }}>
      <TwoColumns>
        {nodes.map((node) => (
          <NodeRows key={node.kind === "group" ? `group:${node.label}` : node.key} node={node} />
        ))}
      </TwoColumns>
    </Box>
  </Box>
);
