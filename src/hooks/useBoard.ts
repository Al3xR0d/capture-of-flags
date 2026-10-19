import { useEffect, useState, useSyncExternalStore } from "react";
import type { Feed } from "../api/sources";
import { BoardEngine } from "../game/engine";

interface Options {
  feed: Feed;
  pollMs: number;
  maxArcs: number;
  onFirstBlood?: (team: string, service: string) => void;
  onFirstBloodBadgeClick?: (teamId: number, teamName: string, services: string[]) => void;
}

/** Движок борды, подключённый к фиду данных. */
export function useBoard({ feed, pollMs, maxArcs, onFirstBlood, onFirstBloodBadgeClick }: Options): BoardEngine {
  const [engine] = useState(() => new BoardEngine({ pollMs, maxArcs, onFirstBlood, onFirstBloodBadgeClick }));
  useSyncExternalStore(engine.subscribe, engine.getVersion);

  useEffect(() => {
    const stop = feed.start({
      snapshot: (s) => engine.applySnapshot(s),
      attacks: (a) => engine.applyLiveAttacks(a),
      failed: () => engine.markScoreboardFailed(),
      shields: (ids) => engine.applyShields(ids),
    });
    return () => {
      stop();
      engine.dispose();
    };
  }, [engine, feed]);

  // Видимость вкладки нужна движку, чтобы не запускать 3D-первую кровь по
  // данным, пришедшим в фон (и не показывать её сразу после возвращения).
  // Дуги атак от видимости не зависят.
  useEffect(() => {
    const sync = () => engine.setWatching(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => document.removeEventListener("visibilitychange", sync);
  }, [engine]);

  return engine;
}
