import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    sectionHeading: CSSProperties;
  }
  interface TypographyVariantsOptions {
    sectionHeading?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    sectionHeading: true;
  }
}

const base = createTheme();

// The app's one MUI theme: MUI's defaults plus the app's own text styles and tooltip look
export const theme = createTheme(base, {
  typography: {
    // A section's small heading: caption text in bold capitals, in the secondary text colour
    sectionHeading: {
      ...base.typography.caption,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: base.palette.text.secondary,
    },
  },
  components: {
    // Every hover tooltip: a white box in body-size text with an arrow pointing at what's hovered
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: "#fff",
          color: "rgba(0, 0, 0, 0.87)",
          fontSize: "0.875rem",
          lineHeight: 1.45,
          padding: "8px 12px",
          maxWidth: 360,
          border: "1px solid rgba(0, 0, 0, 0.12)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        },
        arrow: {
          color: "#fff",
          "&::before": { border: "1px solid rgba(0, 0, 0, 0.12)" },
        },
      },
    },
  },
});
