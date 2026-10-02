import type { Point } from "./types";

export const initials = (name: string): string => {
  const w = name.split(/[\s_\-.]+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase();
};

/** Стабильный оттенок аватарки по имени команды. */
export const hueOf = (name: string): number => {
  let h = 0;
  for (const ch of name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
};

const ruNumber = new Intl.NumberFormat("ru-RU");
/** Очки — целым числом с разрядами. */
export const fmtScore = (n: number): string => ruNumber.format(Math.round(n));

export const p2 = (n: number): string => String(n).padStart(2, "0");

/** Секунды → «мм:сс» или «ч:мм:сс». */
export const fmtDuration = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${p2(h)}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
};

export const clockTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const plural = (n: number, one: string, few: string, many: string): string => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export interface Bezier {
  p0: Point;
  c: Point;
  p2: Point;
  /** Видимый участок — обрезан по краям карточек. */
  t0: number;
  t1: number;
}

/** Точка квадратичной кривой Безье. */
export const bz = (g: Pick<Bezier, "p0" | "c" | "p2">, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * g.p0.x + 2 * u * t * g.c.x + t * t * g.p2.x,
    y: u * u * g.p0.y + 2 * u * t * g.c.y + t * t * g.p2.y,
  };
};
