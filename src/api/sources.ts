import type { BoardConfig, BoardQuery } from "../config";
import type { Snapshot } from "../game/types";
import { createMockScoreboard, createMockShields } from "./mock";
import { normalizeScoreboard, normalizeShields } from "./normalize";

/**
 * Подключаемый источник данных. `fetch` резолвится в null, если ответа нет
 * или он невалидный, — тогда соответствующие данные просто не отображаются.
 */
export interface Source<T> {
  readonly kind: "http" | "mock";
  fetch(): Promise<T | null>;
}

export interface Sources {
  scoreboard: Source<Snapshot> | null;
  shields: Source<number[]> | null;
}

function httpSource<T>(url: string, timeoutMs: number, parse: (raw: unknown) => T | null): Source<T> {
  return {
    kind: "http",
    async fetch() {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
        if (!res.ok) return null;
        return parse(await res.json());
      } catch (err) {
        console.warn(`[board] ${url}:`, err);
        return null;
      }
    },
  };
}

function mockSource<T>(gen: () => unknown, parse: (raw: unknown) => T | null): Source<T> {
  return { kind: "mock", fetch: async () => parse(gen()) };
}

export function createSources(cfg: BoardConfig, query: BoardQuery): Sources {
  if (query.mock) {
    return {
      scoreboard: mockSource(createMockScoreboard(query.mockTeams), normalizeScoreboard),
      shields: mockSource(createMockShields(query.mockTeams), normalizeShields),
    };
  }
  const { scoreboard, shields } = cfg.sources;
  return {
    scoreboard: scoreboard.url ? httpSource(scoreboard.url, cfg.requestTimeoutMs, normalizeScoreboard) : null,
    shields: shields.url ? httpSource(shields.url, cfg.requestTimeoutMs, normalizeShields) : null,
  };
}
