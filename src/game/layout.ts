import { CARD_H, CARD_W } from "./constants";
import type { MapLayout, Point } from "./types";

/** Показатель суперэллипса — между эллипсом (2) и прямоугольником (∞). */
const N = 3.4;
const SAMPLES = 1440;
const MAX_SCALE = 1.5;
const MIN_SCALE = 0.5;

/**
 * Раскладывает карточки равномерно по суперэллипсу, вписанному в W×H,
 * подбирая максимальный масштаб карточек, при котором они не перекрываются.
 * Первая команда — сверху, дальше по часовой. Порядок — по team_id,
 * чтобы карточки не прыгали при смене мест.
 */
export function computeLayout(W: number, H: number, teamIds: number[]): MapLayout {
  const ids = [...teamIds].sort((a, b) => a - b);
  const n = Math.max(1, ids.length);
  const cx = W / 2;
  const cy = H / 2;
  let best!: { s: number; pts: Point[]; cum: number[]; tot: number };

  for (let s = MAX_SCALE; s >= MIN_SCALE; s -= 0.02) {
    const cw = CARD_W * s;
    const ch = CARD_H * s;
    const rx = Math.max(40, W / 2 - cw / 2 - 12);
    const ry = Math.max(40, H / 2 - ch / 2 - 18);
    const pts: Point[] = [];
    const cum = [0];
    let tot = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const th = -Math.PI / 2 + (2 * Math.PI * i) / SAMPLES;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const x = cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / N);
      const y = cy + ry * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / N);
      if (i) {
        const p = pts[i - 1];
        // Расстояние в «карточках» (Чебышёв, нормированный на размер карточки).
        tot += Math.max(Math.abs(x - p.x) / cw, Math.abs(y - p.y) / ch);
        cum.push(tot);
      }
      pts.push({ x, y });
    }
    best = { s, pts, cum, tot };
    if (tot / n >= 1.1) break;
  }

  const pos = new Map<number, Point>();
  let j = 0;
  ids.forEach((id, k) => {
    const tg = (k * best.tot) / n;
    while (j < SAMPLES - 1 && best.cum[j + 1] < tg) j++;
    const a = best.pts[j];
    const b = best.pts[j + 1];
    const seg = best.cum[j + 1] - best.cum[j] || 1;
    const f = (tg - best.cum[j]) / seg;
    pos.set(id, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  });
  return { s: best.s, pos };
}
