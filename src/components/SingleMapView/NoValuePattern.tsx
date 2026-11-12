import { NO_VALUE_HATCH, noValuePatternId } from "../../config/colorSchemes";
import styles from "./SingleMapView.module.scss";

// One map's hatch for areas with no value, defined inside the map so its snapshot includes it
export const NoValuePattern = ({ mapId }: { mapId: string }) => (
  <svg width="0" height="0" className={styles["no-value-pattern"]} aria-hidden="true">
    <defs>
      <pattern
        id={noValuePatternId(mapId)}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill={NO_VALUE_HATCH.ground} />
        <line x1="0" y1="0" x2="0" y2="6" stroke={NO_VALUE_HATCH.stripe} strokeWidth="2" />
      </pattern>
    </defs>
  </svg>
);
