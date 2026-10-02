export interface SnapshotTeam {
  id: number;
  name: string;
  place: number;
  /** serv_name → код статуса чекера. Нет ключа — статус не пришёл. */
  status: Record<string, number>;
  // Расширенные поля (бэкенд борды). Нет — не отображаются.
  score?: number;
  /** Флагов за игру. */
  stolen?: number;
  lost?: number;
  /** serv_name → SLA, %. */
  sla?: Record<string, number>;
  /** Сервисы, на которых взята первая кровь. */
  firstBloods?: string[];
}

export interface Attack {
  from: number;
  to: number;
  flags: number;
  /** serv_name, если API его прислал. */
  service?: string;
  firstBlood?: boolean;
}

/** Нормализованный ответ API за один опрос. */
export interface Snapshot {
  round: number | null;
  teams: SnapshotTeam[];
  /** Сервисы в порядке появления в ответе. */
  services: string[];
  attacks: Attack[];
  /** Атаки приходят потоком (applyLiveAttacks), а не раскидываются из снапшота. */
  liveAttacks?: boolean;
  /** Таймеры раунда/игры, если источник их знает. */
  timing?: RoundTiming;
  /** false — игра на паузе. */
  gameRunning?: boolean;
  /** id сервиса → serv_name (для пачек атак из потока). */
  serviceById?: Record<number, string>;
}

export interface RoundTiming {
  /** Начало раунда в локальных часах (мс), с поправкой на сдвиг часов сервера. */
  roundStart: number;
  /** Длина раунда, с. */
  roundTime: number;
  totalRounds?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapLayout {
  /** Масштаб карточек. */
  s: number;
  pos: Map<number, Point>;
}

export interface Arc extends Attack {
  born: number;
  /** Притяжение к центру карты. */
  pull: number;
  /** Боковой изгиб. */
  bow: number;
  hit?: boolean;
}

export interface ShieldPulse {
  team: number;
  born: number;
}

export type ConnectionState = "waiting" | "live" | "stale" | "offline";
