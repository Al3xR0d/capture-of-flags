import type { BoardConfig, BoardQuery } from "../config";
import type { Attack, Snapshot } from "../game/types";
import { createMockScoreboard, createMockShields } from "./mock";
import { normalizeBoard, normalizeBoardAttacks, normalizeScoreboard, normalizeShields } from "./normalize";

/**
 * Подключаемые источники. Каждый резолвится в null / молчит, если ответа нет
 * или он невалидный, — тогда соответствующие данные просто не отображаются.
 */

export interface FeedHandlers {
  snapshot(s: Snapshot): void;
  /** Пачка атак из потока (только у фида бэкенда борды). */
  attacks(a: Attack[]): void;
  /** Табло не ответило. */
  failed(): void;
  shields(teamIds: number[]): void;
}

export interface Feed {
  readonly kind: "board" | "http" | "mock";
  /** Запускает фид, возвращает остановку. */
  start(h: FeedHandlers): () => void;
}

type Fetcher<T> = () => Promise<T | null>;

function httpFetcher<T>(url: string, timeoutMs: number, parse: (raw: unknown) => T | null): Fetcher<T> {
  return async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
      if (!res.ok) return null;
      return parse(await res.json());
    } catch (err) {
      console.warn(`[board] ${url}:`, err);
      return null;
    }
  };
}

/** Периодический опрос: функция зовётся сразу и раз в `ms`, без наложения запросов. */
function every(ms: number, fn: () => Promise<void>): () => void {
  let stopped = false;
  let inFlight = false;
  const run = async () => {
    if (inFlight || stopped) return;
    inFlight = true;
    try {
      await fn();
    } finally {
      inFlight = false;
    }
  };
  void run();
  const id = window.setInterval(run, ms);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}

/**
 * Опрос табло старого формата (или моков) + щитов. Щиты применяются после
 * табло, чтобы попасть в тот же раунд.
 */
function pollingFeed(
  kind: "http" | "mock",
  pollMs: number,
  scoreboard: Fetcher<Snapshot> | null,
  shields: Fetcher<number[]> | null,
): Feed {
  return {
    kind,
    start(h) {
      return every(pollMs, async () => {
        const [board, sh] = await Promise.all([scoreboard?.() ?? null, shields?.() ?? null]);
        if (board) h.snapshot(board);
        else h.failed();
        if (board && sh) h.shields(sh);
      });
    },
  };
}

/**
 * Бэкенд борды: SSE /api/stream (`board` — снапшот, `attacks` — пачка атак).
 * EventSource сам переподключается; щиты Wazuh — отдельным опросом.
 */
function boardFeed(baseUrl: string, pollMs: number, shields: Fetcher<number[]> | null): Feed {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/stream`;
  return {
    kind: "board",
    start(h) {
      let serviceById: Record<number, string> = {};
      const es = new EventSource(url);

      es.addEventListener("board", (e) => {
        const snap = normalizeBoard(safeJson((e as MessageEvent<string>).data));
        if (!snap) return;
        serviceById = snap.serviceById ?? {};
        h.snapshot(snap);
      });
      es.addEventListener("attacks", (e) => {
        const raw = safeJson((e as MessageEvent<string>).data) as { attacks?: unknown } | null;
        const attacks = normalizeBoardAttacks(raw?.attacks, serviceById);
        if (attacks.length) h.attacks(attacks);
      });
      es.onerror = () => h.failed();

      const stopShields = shields
        ? every(pollMs, async () => {
            const ids = await shields();
            if (ids) h.shields(ids);
          })
        : () => {};

      return () => {
        es.close();
        stopShields();
      };
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createFeed(cfg: BoardConfig, query: BoardQuery): Feed {
  if (query.mock) {
    const sb = createMockScoreboard(query.mockTeams);
    const sh = createMockShields(query.mockTeams);
    return pollingFeed(
      "mock",
      cfg.pollMs,
      async () => normalizeScoreboard(sb()),
      async () => normalizeShields(sh()),
    );
  }

  const { board, scoreboard, shields } = cfg.sources;
  const shieldFetcher = shields.url ? httpFetcher(shields.url, cfg.requestTimeoutMs, normalizeShields) : null;
  if (board.url) return boardFeed(board.url, cfg.pollMs, shieldFetcher);
  return pollingFeed(
    "http",
    cfg.pollMs,
    scoreboard.url ? httpFetcher(scoreboard.url, cfg.requestTimeoutMs, normalizeScoreboard) : null,
    shieldFetcher,
  );
}
