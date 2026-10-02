import { useEffect, useState, useSyncExternalStore } from "react";
import type { Sources } from "../api/sources";
import { BoardEngine } from "../game/engine";

interface Options {
  sources: Sources;
  pollMs: number;
  maxArcs: number;
}

/**
 * Движок борды + опрос источников. Табло и щиты запрашиваются параллельно;
 * щиты применяются после табло, чтобы попасть в тот же раунд.
 */
export function useBoard({ sources, pollMs, maxArcs }: Options): BoardEngine {
  const [engine] = useState(() => new BoardEngine({ pollMs, maxArcs }));
  useSyncExternalStore(engine.subscribe, engine.getVersion);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [board, shields] = await Promise.all([
          sources.scoreboard?.fetch() ?? Promise.resolve(null),
          sources.shields?.fetch() ?? Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (board) engine.applySnapshot(board);
        else engine.markScoreboardFailed();
        if (board && shields) engine.applyShields(shields);
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const id = window.setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
      engine.dispose();
    };
  }, [engine, sources, pollMs]);

  return engine;
}
