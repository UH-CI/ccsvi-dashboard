import { Alert, Snackbar } from "@mui/material";
import { useErrorToastStore } from "../../stores/useErrorToastStore";

// A short message at the bottom of the screen when something couldn't be loaded; clicking the map doesn't hide it
export const ErrorToast = () => {
  const message = useErrorToastStore((state) => state.message);
  const open = useErrorToastStore((state) => state.open);
  const dismiss = useErrorToastStore((state) => state.dismiss);

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== "clickaway" && dismiss()}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity="error" variant="filled" onClose={dismiss}>
        {message}
      </Alert>
    </Snackbar>
  );
};
