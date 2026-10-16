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
import type { BoardConfig, BoardQuery } from "./config";
import { loadConfig, readQuery } from "./config";
import { FirstBloodProvider } from "./first-blood";
import { callHideFirstBloodBadge } from "./firstBloodOverlay";

const query = readQuery();

void loadConfig(query).then((config) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <FirstBloodWrapper config={config} query={query} />
    </StrictMode>,
  );
});

export function FirstBloodWrapper({ config, query }: { config: BoardConfig; query: BoardQuery }) {
  return (
    <FirstBloodProvider
      holdMs={5000}
      volume={0.7}
      quality="auto"
      onShow={() => callHideFirstBloodBadge(true)}
      onClose={() => callHideFirstBloodBadge(false)}
    >
      <App config={config} query={query} />
    </FirstBloodProvider>
  );
}

