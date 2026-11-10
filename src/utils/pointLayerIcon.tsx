import * as FaIcons from "react-icons/fa";
import type { PointLayerConfig } from "../types";

// A point layer's map icon, small, in its colour, for a line of text
export const PointLayerIcon = ({ layer }: { layer: PointLayerConfig }) => {
  const IconComponent = FaIcons[(layer.icon ?? "") as keyof typeof FaIcons] || FaIcons.FaCircle;
  return (
    <span style={{ color: layer.color, verticalAlign: "middle", marginLeft: 4 }}>
      <IconComponent size={12} />
    </span>
  );
};
