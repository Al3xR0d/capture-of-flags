import { useEffect, useState, useSyncExternalStore } from "react";
import type { Feed } from "../api/sources";
import { BoardEngine } from "../game/engine";

interface Options {
  feed: Feed;
  pollMs: number;
  maxArcs: number;
}

/** Движок борды, подключённый к фиду данных. */
export function useBoard({ feed, pollMs, maxArcs }: Options): BoardEngine {
  const [engine] = useState(() => new BoardEngine({ pollMs, maxArcs }));
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

  return engine;
}
