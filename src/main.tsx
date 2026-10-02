import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "./styles.css";
import App from "./App";
import { loadConfig, readQuery } from "./config";

const query = readQuery();

void loadConfig(query).then((config) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} query={query} />
    </StrictMode>,
  );
});
