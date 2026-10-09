import { renderToString } from "react-dom/server";
import * as FaIcons from "react-icons/fa";
import type { PointLayerConfig } from "../types";

// Icon map markers for reuse in plain HTML instead of a react component
export const pointLayerIconHtml = (layer: PointLayerConfig): string => {
  const IconComponent = FaIcons[(layer.icon ?? "") as keyof typeof FaIcons] || FaIcons.FaCircle;
  return renderToString(
    <span style={{ color: layer.color, verticalAlign: "middle", marginLeft: 4 }}>
      <IconComponent size={12} />
    </span>,
  );
};