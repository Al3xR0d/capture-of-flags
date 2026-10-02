export interface SnapshotTeam {
  id: number;
  name: string;
  place: number;
  /** serv_name → код статуса чекера. Нет ключа — статус не пришёл. */
  status: Record<string, number>;
}

export interface Attack {
  from: number;
  to: number;
  flags: number;
}

/** Нормализованный ответ API за один опрос. */
export interface Snapshot {
  round: number | null;
  teams: SnapshotTeam[];
  /** Сервисы в порядке появления в ответе. */
  services: string[];
  attacks: Attack[];
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
