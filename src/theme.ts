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

// The app's one MUI theme: MUI's defaults plus the app's own text styles
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
});
