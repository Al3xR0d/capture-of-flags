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
