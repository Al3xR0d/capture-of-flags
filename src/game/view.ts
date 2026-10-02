import type { BoardMode } from "../config";
import { RED, SHIELD, STATUS, TIP_W, UNKNOWN_STATUS } from "./constants";
import type { BoardEngine } from "./engine";
import type { SnapshotTeam } from "./types";
import { clockTime, fmtScore, hueOf, initials } from "./utils";

export interface Avatar {
  ini: string;
  avBg: string;
  avFg: string;
}

export interface ServiceCell {
  name: string;
  l: string;
  label: string;
  short: string;
  color: string;
  bg: string;
  bd: string;
  /** SLA, % — если источник его даёт. */
  sla?: number;
}

export interface CardView extends Avatar {
  id: number;
  name: string;
  place: number;
  delta: Delta;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  z: number;
  border: string;
  bg: string;
  shadow: string;
  mine: boolean;
  svcs: ServiceCell[];
  score: string | null;
  /** Коды сервисов с первой кровью: «VA SH». */
  fbLetters: string | null;
}

export interface Delta {
  text: string;
  color: string;
}

export interface TipView extends Avatar {
  name: string;
  place: number;
  delta: Delta;
  stolen: number;
  lost: number;
  victims: string[];
  attackers: string[];
  left: number;
  top: number;
  svcs: ServiceCell[];
  score: string | null;
  /** За всю игру, если источник даёт. */
  stolenTotal: string | null;
  lostTotal: string | null;
}

export interface RankRow extends Avatar {
  id: number;
  place: number;
  name: string;
  delta: Delta;
  mine: boolean;
  score: string | null;
}

export const avatar = (name: string): Avatar => {
  const hue = hueOf(name);
  return { ini: initials(name), avBg: `oklch(0.36 0.07 ${hue})`, avFg: `oklch(0.93 0.05 ${hue})` };
};

const NEUTRAL = "oklch(0.55 0.02 255)";

interface ViewOptions {
  mode: BoardMode;
  myTeam: number | null;
}

/** Всё, что рисует UI, из текущего состояния движка. */
export function buildView(engine: BoardEngine, { mode, myTeam }: ViewOptions) {
  const snap = engine.snapshot;
  const now = performance.now();
  const { layout: L, hover: hov, teamFilter: tf } = engine;
  const teams = snap?.teams ?? [];
  const byId = new Map(teams.map((t) => [t.id, t]));
  const services = snap?.services ?? [];
  const catalog = engine.catalog;
  const attacks = snap?.attacks ?? [];

  const delta = (t: SnapshotTeam): Delta => {
    const prev = engine.prevPlaces[t.id];
    const d = prev == null ? 0 : prev - t.place;
    return {
      text: d > 0 ? `↑${d}` : d < 0 ? `↓${-d}` : "—",
      color: d > 0 ? STATUS[101].c : d < 0 ? RED.c : NEUTRAL,
    };
  };

  const cells = (t: SnapshotTeam): ServiceCell[] =>
    services.map((name) => {
      const code = t.status[name];
      const st = (code != null && STATUS[code]) || UNKNOWN_STATUS;
      return {
        name,
        l: catalog[name]?.l ?? "?",
        label: st.label,
        short: st.short,
        color: st.c,
        bg: st === UNKNOWN_STATUS ? "transparent" : st.a(0.2),
        bd: st === UNKNOWN_STATUS ? `1px dashed ${st.a(0.6)}` : `1px solid ${st.a(0.55)}`,
        sla: t.sla?.[name],
      };
    });

  const score = (t: SnapshotTeam) => (t.score != null ? fmtScore(t.score) : null);
  const fbLetters = (t: SnapshotTeam) =>
    t.firstBloods?.length ? t.firstBloods.map((n) => catalog[n]?.l ?? n).join(" ") : null;

  // Команды, связанные с наведённой/выбранной атаками этого раунда, остаются яркими.
  const focus = hov ?? tf;
  let involved: Set<number> | null = null;
  if (focus != null) {
    involved = new Set([focus]);
    for (const a of attacks) {
      if (a.from === focus) involved.add(a.to);
      if (a.to === focus) involved.add(a.from);
    }
  }

  const cards: CardView[] = teams.flatMap((t) => {
    const p = L.pos.get(t.id);
    if (!p) return [];
    const flashing = (engine.flash[t.id] ?? 0) > now;
    const g = engine.glow[t.id];
    const glowing = !!g && g.until > now;
    const shielded = engine.isShielded(t.id, now);
    const mine = t.id === myTeam;

    let border = "oklch(0.34 0.025 255)";
    let bg = "oklch(0.2 0.02 255 / 0.94)";
    const sh = ["0 4px 14px oklch(0 0 0 / 0.35)"];
    if (tf === t.id) border = "oklch(0.85 0.02 255)";
    if (shielded) {
      border = SHIELD.c;
      sh.unshift(`0 0 18px ${SHIELD.a(0.45)}`);
    }
    if (glowing) {
      border = g.color;
      sh.unshift(`0 0 16px ${g.glow}`);
    }
    if (flashing) {
      border = RED.c;
      bg = RED.a(0.24);
      sh.unshift(`0 0 22px ${RED.a(0.6)}`);
    }
    if (mine) sh.unshift("0 0 0 2px oklch(0.97 0.005 255)");

    return [{
      id: t.id,
      name: t.name,
      ...avatar(t.name),
      place: t.place,
      delta: delta(t),
      x: Math.round(p.x),
      y: Math.round(p.y),
      scale: L.s,
      opacity: involved && !involved.has(t.id) ? (hov != null ? 0.22 : 0.4) : 1,
      z: hov === t.id ? 6 : flashing || glowing ? 3 : 1,
      border,
      bg,
      shadow: sh.join(","),
      mine,
      svcs: cells(t),
      score: score(t),
      fbLetters: fbLetters(t),
    }];
  });

  let tip: TipView | null = null;
  const ht = hov != null ? byId.get(hov) : undefined;
  const hp = hov != null ? L.pos.get(hov) : undefined;
  if (mode === "interactive" && ht && hp) {
    // Посередине между карточкой и центром карты.
    const tx = hp.x + (engine.W / 2 - hp.x) * 0.5;
    const ty = hp.y + (engine.H / 2 - hp.y) * 0.5;
    const out = attacks.filter((a) => a.from === ht.id);
    const inc = attacks.filter((a) => a.to === ht.id);
    const name = (id: number) => byId.get(id)?.name ?? `team-${id}`;
    tip = {
      name: ht.name,
      ...avatar(ht.name),
      place: ht.place,
      delta: delta(ht),
      stolen: out.reduce((s, a) => s + a.flags, 0),
      lost: inc.reduce((s, a) => s + a.flags, 0),
      // Атаки по разным сервисам на одну команду — одно имя.
      victims: [...new Set(out.map((a) => name(a.to)))],
      attackers: [...new Set(inc.map((a) => name(a.from)))],
      left: Math.round(Math.max(8, Math.min(engine.W - TIP_W - 8, tx - TIP_W / 2))),
      top: Math.round(Math.max(8, Math.min(engine.H - 380, ty - 170))),
      svcs: cells(ht),
      score: score(ht),
      stolenTotal: ht.stolen != null ? fmtScore(ht.stolen) : null,
      lostTotal: ht.lost != null ? fmtScore(ht.lost) : null,
    };
  }

  const ranked = [...teams].sort((a, b) => a.place - b.place);
  const rankRow = (t: SnapshotTeam): RankRow => ({
    id: t.id,
    place: t.place,
    name: t.name,
    delta: delta(t),
    mine: t.id === myTeam,
    score: score(t),
    ...avatar(t.name),
  });
  const topN = mode === "screen" ? 10 : 5;
  const me = myTeam != null ? byId.get(myTeam) : undefined;

  return {
    mode,
    connection: engine.connection,
    lastUpdate: engine.lastUpdate != null ? clockTime(engine.lastUpdate) : null,
    round: snap?.round ?? null,
    teamCount: teams.length,
    serviceCount: services.length,
    cards,
    tip,
    top: ranked.slice(0, topN).map(rankRow),
    topN,
    hasMyTeam: !!me,
    myRow: me && !ranked.slice(0, topN).includes(me) ? rankRow(me) : null,
    services: services.flatMap((name) => (catalog[name] ? [catalog[name]] : [])),
    /** API присылает serv_name у атак — дуги цветные, легенда «цвет атаки». */
    attackColors: attacks.some((a) => a.service),
    showShieldLegend: engine.shieldsSeen,
    showFirstBloodLegend: teams.some((t) => t.firstBloods?.length),
    timing: snap?.timing ?? null,
    /** Источник сообщил, что игра на паузе. */
    paused: snap?.gameRunning === false,
    teamFilter: tf,
    teamOptions: [...teams].sort((a, b) => a.id - b.id).map((t) => ({ id: t.id, label: t.name })),
  };
}

export type BoardView = ReturnType<typeof buildView>;
