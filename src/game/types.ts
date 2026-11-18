export interface SnapshotTeam {
  id: number;
  name: string;
  place: number;
  status: Record<string, number>;
  score?: number;
  stolen?: number;
  lost?: number;
  sla?: Record<string, number>;
  firstBloods?: string[];
}

export interface Attack {
  from: number;
  to: number;
  flags: number;
  service?: string;
  firstBlood?: boolean;
  round?: number;
}

export interface Snapshot {
  round: number | null;
  teams: SnapshotTeam[];
  services: string[];
  attacks: Attack[];
  liveAttacks?: boolean;
  timing?: RoundTiming;
  gameRunning?: boolean;
  serviceById?: Record<number, string>;
}

export interface RoundTiming {
  roundStart: number;
  roundTime: number;
  totalRounds?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapLayout {
  s: number;
  pos: Map<number, Point>;
}

export interface Arc extends Attack {
  born: number;
  pull: number;
  bow: number;
  hit?: boolean;
}

export interface ShieldPulse {
  team: number;
  born: number;
}

export type ConnectionState = "waiting" | "live" | "stale" | "offline";
