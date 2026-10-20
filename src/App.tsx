import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFeed } from "./api/sources";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import type { BoardConfig, BoardQuery } from "./config";
import { buildView } from "./game/view";
import { useBoard } from "./hooks/useBoard";
import { useFirstBlood, useFirstBloodBatch } from "./first-blood";
import { setFirstBloodBadgeCallback } from "./firstBloodOverlay";

interface Props {
  config: BoardConfig;
  query: BoardQuery;
}

export default function App({ config, query }: Props) {
  const feed = useMemo(() => createFeed(config, query), [config, query]);
  const firstBlood = useFirstBlood();
  const firstBloodBatch = useFirstBloodBatch();
  const engineRef = useRef<ReturnType<typeof useBoard>>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const handleFirstBlood = useCallback(
    (team: string, service: string) => {
      firstBlood({ team, service, color: "#ffc94d" });
    },
    [firstBlood],
  );

  const onFirstBloodWithOverlay = useMemo(
    () => (team: string, service: string) => {
      handleFirstBlood(team, service);
    },
    [handleFirstBlood],
  );

  // Обработка клика на бейдж первой крови — запускает анимацию со всеми сервисами
  const onFirstBloodBadgeClick = useMemo(
    () => (_teamId: number, teamName: string, services: string[]) => {
      if (!firstBloodBatch || !services.length) return;
      firstBloodBatch(services.map((service) => ({ team: teamName, service, color: "#ffc94d" })));
    },
    [firstBloodBatch],
  );

  const engine = useBoard({
    feed,
    pollMs: config.pollMs,
    maxArcs: config.maxArcs,
    onFirstBlood: onFirstBloodWithOverlay,
    onFirstBloodBadgeClick,
  });

  // Сохраняем ссылку на engine для доступа из callback оверлея
  engineRef.current = engine;

  // Регистрируем коллбэк для управления бейджем первой крови
  useEffect(() => {
    return setFirstBloodBadgeCallback((hide: boolean) => {
      engine.setHideFirstBloodBadge(hide);
    });
  }, [engine]);

  const view = buildView(engine, { mode: query.mode, myTeam: query.myTeam });

  return (
    <div className={`app app--${query.mode}`}>
      <Header title={config.title} view={view} mock={query.mock} />
      <main className={`layout${isSidebarVisible ? " layout--sidebar" : ""}`}>
        <MapView
          engine={engine}
          view={view}
          onShowSidebar={() => setIsSidebarVisible(true)}
        />
        <Sidebar
          engine={engine}
          view={view}
          onClose={() => setIsSidebarVisible(false)}
        />
      </main>
    </div>
  );
}
