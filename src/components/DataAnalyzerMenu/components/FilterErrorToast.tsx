import { useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { useAreaFilter } from "../../../api/queries/filter";

// A short message at the bottom of the screen when the Filter's request fails; clicking the map doesn't hide it
export const FilterErrorToast = () => {
  const { error } = useAreaFilter();
  const [dismissed, setDismissed] = useState<Error | null>(null);
  const dismiss = () => setDismissed(error);

  return (
    <Snackbar
      open={error !== null && error !== dismissed}
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== "clickaway" && dismiss()}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity="error" variant="filled" onClose={dismiss}>
        The filter couldn't be applied. Please try again.
      </Alert>
    </Snackbar>
  );
};
