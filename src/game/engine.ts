import {
  ACCENT, ARC_LIFE, ARC_TRAVEL, BOWS, CARD_H, CARD_W, RED, SHIELD, SHIELD_LIFE, SPREAD,
  serviceCatalog, type ServiceInfo, type Tone,
} from "./constants";
import { computeLayout } from "./layout";
import type { Arc, Attack, ConnectionState, MapLayout, ShieldPulse, Snapshot } from "./types";
import { bz, type Bezier } from "./utils";

type Listener = () => void;

export interface EngineOptions {
  pollMs: number;
  maxArcs: number;
}

/**
 * Состояние борды. Не зависит от React: React подписывается через
 * `subscribe` / `getVersion` (useSyncExternalStore), канвас рисуется вызовом
 * `draw` из rAF.
 *
 * Каждый ответ API — снапшот раунда. Атаки снапшота раскидываются дугами по
 * окну опроса, команды с сработавшей защитой (Wazuh) получают по одному
 * пульсу щита за раунд.
 */
export class BoardEngine {
  readonly opts: EngineOptions;

  snapshot: Snapshot | null = null;
  /** Места команд в предыдущем раунде — для ↑/↓. */
  prevPlaces: Record<number, number> = {};
  connection: ConnectionState = "waiting";
  /** Date.now() последнего успешного ответа. */
  lastUpdate: number | null = null;
  /** Источник щитов ответил хотя бы раз — показываем легенду щитов. */
  shieldsSeen = false;

  arcs: Arc[] = [];
  shields: ShieldPulse[] = [];
  /** team id → до какого момента подсвечена как жертва. */
  flash: Record<number, number> = {};
  /** team id → подсветка атакующей цветом сервиса. */
  glow: Record<number, { until: number; color: string; glow: string }> = {};
  /** Буква и цвет каждого сервиса текущего снапшота. */
  catalog: Record<string, ServiceInfo> = {};

  W = 1200;
  H = 800;
  layout: MapLayout = { s: 1, pos: new Map() };

  hover: number | null = null;
  teamFilter: number | null = null;

  private version = 0;
  private listeners = new Set<Listener>();
  private slot = 0;
  /** Раунд, атаки которого уже показаны. */
  private spawnedRound: number | null | undefined = undefined;
  private shieldedRound: number | null | undefined = undefined;
  private shielded = new Set<number>();
  /** Отложенные появления дуг/щитов текущего раунда. */
  private pending = new Set<number>();
  private timeouts = new Set<number>();

  constructor(opts: EngineOptions) {
    this.opts = opts;
  }

  // ── store ──────────────────────────────────────────────────────────────

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getVersion = (): number => this.version;

  /** Уведомить сейчас и ещё раз через `ms`, чтобы истекли подсветки. */
  private bump(ms?: number) {
    this.version++;
    this.listeners.forEach((l) => l());
    if (ms) this.later(() => this.bump(), ms + 20, this.timeouts);
  }

  private later(fn: () => void, ms: number, bucket: Set<number>) {
    const id = window.setTimeout(() => {
      bucket.delete(id);
      fn();
    }, ms);
    bucket.add(id);
  }

  dispose() {
    for (const id of [...this.pending, ...this.timeouts]) clearTimeout(id);
    this.pending.clear();
    this.timeouts.clear();
  }

  // ── данные ─────────────────────────────────────────────────────────────

  applySnapshot(snap: Snapshot) {
    const prev = this.snapshot;
    const newRound = snap.round == null || snap.round !== prev?.round;
    if (prev && newRound) {
      this.prevPlaces = Object.fromEntries(prev.teams.map((t) => [t.id, t.place]));
    }

    const ids = snap.teams.map((t) => t.id);
    const sameTeams = prev && prev.teams.length === ids.length && prev.teams.every((t, i) => t.id === ids[i]);
    this.snapshot = snap;
    this.catalog = serviceCatalog(snap.services);
    if (!sameTeams) this.layout = computeLayout(this.W, this.H, ids);

    this.connection = "live";
    this.lastUpdate = Date.now();

    if (snap.round == null || snap.round !== this.spawnedRound) {
      this.spawnedRound = snap.round;
      this.scheduleAttacks(snap.attacks);
    }
    this.bump();
  }

  /** Ответа нет: если данных ещё не было — offline, иначе показываем последние как устаревшие. */
  markScoreboardFailed() {
    this.connection = this.snapshot ? "stale" : "offline";
    this.bump();
  }

  applyShields(teamIds: number[]) {
    this.shieldsSeen = true;
    const round = this.snapshot?.round ?? null;
    if (round == null || round !== this.shieldedRound) {
      this.shieldedRound = round;
      this.shielded.clear();
    }
    const known = this.layout.pos;
    const window = this.opts.pollMs * SPREAD;
    for (const id of teamIds) {
      if (this.shielded.has(id) || !known.has(id)) continue;
      this.shielded.add(id);
      this.later(() => this.addShield(id), Math.random() * window, this.pending);
    }
    this.bump();
  }

  private scheduleAttacks(attacks: Attack[]) {
    for (const id of this.pending) clearTimeout(id);
    this.pending.clear();
    const window = this.opts.pollMs * SPREAD;
    for (const a of attacks) this.later(() => this.addArc(a), Math.random() * window, this.pending);
  }

  private addArc(a: Attack) {
    const pos = this.layout.pos;
    if (!pos.has(a.from) || !pos.has(a.to)) return;
    const tf = this.teamFilter;
    if (tf != null && tf !== a.from && tf !== a.to) return;

    while (this.arcs.length >= this.opts.maxArcs) this.arcs.shift();
    const now = performance.now();
    this.arcs.push({
      ...a,
      born: now,
      pull: 0.22 + Math.random() * 0.22,
      bow: BOWS[this.slot++ % BOWS.length],
    });
    const tone = this.toneOf(a);
    this.glow[a.from] = { until: now + 900, color: tone.c, glow: tone.a(0.5) };
    this.bump(950);
  }

  private addShield(team: number) {
    this.shields.push({ team, born: performance.now() });
    this.bump(SHIELD_LIFE);
  }

  // ── ввод ───────────────────────────────────────────────────────────────

  setSize(W: number, H: number) {
    if (!W || (Math.abs(W - this.W) < 0.5 && Math.abs(H - this.H) < 0.5)) return;
    this.W = W;
    this.H = H;
    this.layout = computeLayout(W, H, this.snapshot?.teams.map((t) => t.id) ?? []);
    this.bump();
  }

  setHover(id: number | null) {
    if (this.hover === id) return;
    this.hover = id;
    this.bump();
  }

  /** Снять hover, только если он всё ещё на `id` (mouseleave может обогнать mouseenter). */
  leave(id: number) {
    if (this.hover === id) this.setHover(null);
  }

  setTeamFilter(id: number | null) {
    this.teamFilter = id;
    this.arcs = this.arcs.filter((a) => id == null || a.from === id || a.to === id);
    this.bump();
  }

  // ── производные ────────────────────────────────────────────────────────

  /** Цвет атаки: цвет сервиса, если API его прислал, иначе нейтральный. */
  toneOf(a: Attack): Tone {
    return (a.service && this.catalog[a.service]) || ACCENT;
  }

  isShielded(team: number, now: number) {
    return this.shields.some((s) => s.team === team && now - s.born < SHIELD_LIFE);
  }

  // ── канвас ─────────────────────────────────────────────────────────────

  private geom(f: number, t: number, pull: number, bow: number): Bezier | null {
    const L = this.layout;
    const p0 = L.pos.get(f);
    const p2 = L.pos.get(t);
    if (!p0 || !p2) return null;
    const mx = (p0.x + p2.x) / 2;
    const my = (p0.y + p2.y) / 2;
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const g = {
      p0, p2,
      c: {
        x: mx + (this.W / 2 - mx) * pull - dy * bow,
        y: my + (this.H / 2 - my) * pull + dx * bow,
      },
    };
    // Обрезаем кривую по прямоугольникам карточек.
    const hw = (CARD_W / 2) * L.s + 3;
    const hh = (CARD_H / 2) * L.s + 3;
    let t0 = 0;
    while (t0 < 0.45) {
      const q = bz(g, t0);
      if (Math.abs(q.x - p0.x) > hw || Math.abs(q.y - p0.y) > hh) break;
      t0 += 0.01;
    }
    let t1 = 1;
    while (t1 > 0.55) {
      const q = bz(g, t1);
      if (Math.abs(q.x - p2.x) > hw || Math.abs(q.y - p2.y) > hh) break;
      t1 -= 0.01;
    }
    return { ...g, t0, t1 };
  }

  private path(ctx: CanvasRenderingContext2D, g: Bezier, ta: number, tb: number) {
    ctx.beginPath();
    const n = 36;
    for (let i = 0; i <= n; i++) {
      const q = bz(g, ta + ((tb - ta) * i) / n);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    }
  }

  draw(cv: HTMLCanvasElement, now: number) {
    const { W, H } = this;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw;
      cv.height = ph;
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    this.drawShields(ctx, now);
    this.drawHoverLinks(ctx);
    this.drawArcs(ctx, now);
  }

  private drawShields(ctx: CanvasRenderingContext2D, now: number) {
    this.shields = this.shields.filter((s) => now - s.born < SHIELD_LIFE);
    const s = this.layout.s;
    const w = CARD_W * s;
    const h = CARD_H * s;
    for (const sh of this.shields) {
      const p = this.layout.pos.get(sh.team);
      if (!p) continue;
      const age = (now - sh.born) / SHIELD_LIFE;
      ctx.save();
      ctx.strokeStyle = SHIELD.c;
      // Две волны, расходящиеся от карточки.
      for (const phase of [0, 0.35]) {
        const k = (age * 1.6 + phase) % 1;
        const pad = 6 + k * 26;
        ctx.globalAlpha = (1 - k) * (1 - age) * 0.9;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(p.x - w / 2 - pad, p.y - h / 2 - pad, w + pad * 2, h + pad * 2, 10 + pad / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** Наведённая команда: все её атаки за раунд — исходящие сплошные, входящие пунктиром. */
  private drawHoverLinks(ctx: CanvasRenderingContext2D) {
    const hov = this.hover;
    if (hov == null || !this.snapshot) return;
    for (const e of this.snapshot.attacks) {
      if (e.from !== hov && e.to !== hov) continue;
      const g = this.geom(e.from, e.to, 0.3, 0);
      if (!g) continue;
      const out = e.from === hov;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = out ? this.toneOf(e).c : RED.c;
      ctx.lineWidth = 1.3;
      if (!out) ctx.setLineDash([4, 4]);
      this.path(ctx, g, g.t0, g.t1);
      ctx.stroke();
      const q = bz(g, g.t1);
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawArcs(ctx: CanvasRenderingContext2D, now: number) {
    const hov = this.hover;
    const sc = this.layout.s;
    this.arcs = this.arcs.filter((a) => now - a.born < ARC_LIFE);

    for (const a of this.arcs) {
      const g = this.geom(a.from, a.to, a.pull, a.bow);
      if (!g) continue;
      const age = Math.max(0, now - a.born);
      const pr = Math.min(1, age / ARC_TRAVEL);
      const head = g.t0 + (g.t1 - g.t0) * (1 - Math.pow(1 - pr, 3));
      const fade = age < ARC_LIFE - 900 ? 1 : Math.max(0, (ARC_LIFE - age) / 900);
      const dim = hov != null && a.from !== hov && a.to !== hov ? 0.1 : 1;
      const w = 1.5 + Math.min(a.flags - 1, 4) * 0.6;
      const col = this.toneOf(a);
      const svc = a.service ? this.catalog[a.service] : undefined;

      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = col.c;
      // Ореол + след.
      ctx.globalAlpha = fade * dim * 0.16;
      ctx.lineWidth = w + 5;
      this.path(ctx, g, g.t0, head);
      ctx.stroke();
      ctx.globalAlpha = fade * dim * 0.75;
      ctx.lineWidth = w;
      this.path(ctx, g, g.t0, head);
      ctx.stroke();

      if (pr < 1) {
        // Яркая «голова».
        ctx.globalAlpha = dim;
        ctx.lineWidth = w + 0.8;
        this.path(ctx, g, Math.max(g.t0, head - 0.12), head);
        ctx.stroke();
        const q = bz(g, head);
        ctx.shadowColor = col.c;
        ctx.shadowBlur = 14;
        ctx.fillStyle = "oklch(0.98 0.01 250)";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        if (!a.hit) {
          a.hit = true;
          this.flash[a.to] = performance.now() + 550;
          this.bump(600);
        }
        // Наконечник + волна попадания.
        const q = bz(g, g.t1);
        const q2 = bz(g, g.t1 - 0.02);
        const an = Math.atan2(q.y - q2.y, q.x - q2.x);
        const sz = 7 + Math.min(a.flags - 1, 4);
        ctx.globalAlpha = fade * dim;
        ctx.fillStyle = col.c;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - sz * Math.cos(an - 0.42), q.y - sz * Math.sin(an - 0.42));
        ctx.lineTo(q.x - sz * Math.cos(an + 0.42), q.y - sz * Math.sin(an + 0.42));
        ctx.closePath();
        ctx.fill();
        const ia = (age - ARC_TRAVEL) / 600;
        if (ia < 1) {
          ctx.globalAlpha = (1 - ia) * dim;
          ctx.strokeStyle = RED.c;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 4 + ia * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Бейдж у атакующего: код сервиса (если известен), иначе число флагов.
      const s0 = bz(g, g.t0);
      const r = 9 * Math.max(0.85, sc);
      ctx.globalAlpha = fade * dim;
      ctx.fillStyle = "oklch(0.16 0.02 255)";
      ctx.strokeStyle = col.c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s0.x, s0.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col.c;
      const label = svc ? svc.l : String(a.flags);
      ctx.font = `700 ${Math.round(r * (label.length > 1 ? 0.85 : 1.1))}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, s0.x, s0.y + 0.5);

      // Сервис известен и флагов больше одного — «×N» рядом с бейджем.
      if (svc && a.flags > 1) {
        const txt = `×${a.flags}`;
        ctx.font = `700 ${Math.round(r * 0.95)}px "IBM Plex Mono", monospace`;
        const tw = ctx.measureText(txt).width + 8;
        const px = s0.x + r + 2;
        ctx.fillStyle = col.c;
        ctx.beginPath();
        ctx.roundRect(px, s0.y - r * 0.7, tw, r * 1.4, 3);
        ctx.fill();
        ctx.fillStyle = "oklch(0.16 0.02 255)";
        ctx.textAlign = "left";
        ctx.fillText(txt, px + 4, s0.y + 0.5);
      }
      ctx.restore();
    }
  }
}
