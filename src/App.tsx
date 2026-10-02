import { useMemo } from "react";
import { createSources } from "./api/sources";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import type { BoardConfig, BoardQuery } from "./config";
import { buildView } from "./game/view";
import { useBoard } from "./hooks/useBoard";

interface Props {
  config: BoardConfig;
  query: BoardQuery;
}

export default function App({ config, query }: Props) {
  const sources = useMemo(() => createSources(config, query), [config, query]);
  const engine = useBoard({ sources, pollMs: config.pollMs, maxArcs: config.maxArcs });
  const view = buildView(engine, { mode: query.mode, myTeam: query.myTeam });

  return (
    <div className={`app app--${query.mode}`}>
      <Header title={config.title} view={view} mock={query.mock} />
      <main className="layout">
        <MapView engine={engine} view={view} />
        <Sidebar engine={engine} view={view} />
      </main>
    </div>
  );
}
