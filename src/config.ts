/**
 * Конфиг борды. Источники данных читаются в рантайме из /config.json, чтобы
 * менять адреса API без пересборки (в docker — монтировать файл поверх).
 * URL-параметры — режим отображения и моки.
 */

export interface SourceConfig {
  /** Пустой / отсутствует → источник выключен и его данные не отображаются. */
  url?: string | null;
}

export interface BoardConfig {
  title: string;
  /** Период опроса API, мс. Атаки одного ответа раскидываются по этому окну. */
  pollMs: number;
  requestTimeoutMs: number;
  maxArcs: number;
  sources: {
    /** Бэкенд борды (ctf-board-backend). Задан — используется вместо scoreboard. */
    board: SourceConfig;
    /** Старый API (/ctfdata/). */
    scoreboard: SourceConfig;
    shields: SourceConfig;
  };
}

export type BoardMode = "interactive" | "screen";

export interface BoardQuery {
  mode: BoardMode;
  /** Своя команда (подсветка «ВЫ»). */
  myTeam: number | null;
  mock: boolean;
  mockTeams: number;
  /** Переопределение pollMs. */
  pollMs: number | null;
}

export const DEFAULT_CONFIG: BoardConfig = {
  title: "CTF · Attack-Defence",
  pollMs: 150_000,
  requestTimeoutMs: 10_000,
  maxArcs: 40,
  sources: {
    board: { url: "http://localhost:8090" },
    scoreboard: { url: "http://10.62.0.120:8000/ctfdata/" },
    shields: { url: "http://gitlabapps.ctflab.local:8080/ctf-backend/api/wazuh/activity" },
  },
};

const MOCK_POLL_MS = 20_000;

const posInt = (raw: string | null): number | null => {
  const n = raw == null ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** `?mode=screen&team=9&mock=1&teams=16&poll=30000` */
export function readQuery(search = window.location.search): BoardQuery {
  const q = new URLSearchParams(search);
  return {
    mode: q.get("mode") === "screen" ? "screen" : "interactive",
    myTeam: posInt(q.get("team")),
    mock: q.get("mock") === "1",
    mockTeams: posInt(q.get("teams")) ?? 16,
    pollMs: posInt(q.get("poll")),
  };
}

export async function loadConfig(query: BoardQuery): Promise<BoardConfig> {
  let file: Partial<BoardConfig> = {};
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: "no-store" });
    if (res.ok) file = await res.json();
  } catch {
    // нет файла — дефолты
  }
  const cfg: BoardConfig = {
    ...DEFAULT_CONFIG,
    ...file,
    sources: { ...DEFAULT_CONFIG.sources, ...file.sources },
  };
  cfg.pollMs = query.pollMs ?? (query.mock ? MOCK_POLL_MS : cfg.pollMs);
  return cfg;
}
