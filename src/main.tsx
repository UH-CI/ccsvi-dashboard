import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StyledEngineProvider } from "@mui/material/styles";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StyledEngineProvider>
  </React.StrictMode>,
);
