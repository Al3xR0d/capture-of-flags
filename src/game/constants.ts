export interface Tone {
  c: string;
  a: (alpha: number) => string;
}

const mk = (l: number, c: number, h: number): Tone => ({
  c: `oklch(${l} ${c} ${h})`,
  a: (x) => `oklch(${l} ${c} ${h} / ${x})`,
});

export interface StatusInfo extends Tone {
  label: string;
  /** Короткая подпись для узких мест. */
  short: string;
}

/** Коды статусов чекера ForcAD. */
export const STATUS: Record<number, StatusInfo> = {
  101: { label: "UP", short: "UP", ...mk(0.77, 0.17, 150) },
  102: { label: "CORRUPT", short: "CORRUPT", ...mk(0.73, 0.17, 55) },
  103: { label: "MUMBLE", short: "MUMBLE", ...mk(0.86, 0.16, 95) },
  104: { label: "DOWN", short: "DOWN", ...mk(0.66, 0.21, 25) },
  110: { label: "CHECK FAILED", short: "CHK FAIL", ...mk(0.62, 0.015, 250) },
};

export const STATUS_ORDER = [101, 104, 103, 102, 110];

/** Неизвестный / не пришедший статус. */
export const UNKNOWN_STATUS: StatusInfo = { label: "НЕТ ДАННЫХ", short: "—", ...mk(0.5, 0.02, 255) };

export const RED = STATUS[104];
export const ACCENT = mk(0.8, 0.12, 205);
export const SHIELD = mk(0.82, 0.09, 225);

export interface ServiceInfo extends Tone {
  name: string;
  l: string;
}

/** Известные сервисы: буква + цвет атаки. */
const KNOWN_SERVICES: Record<string, { l: string; tone: Tone }> = {
  VibeAura: { l: "V", tone: mk(0.8, 0.12, 205) },
  BioForge: { l: "B", tone: mk(0.72, 0.15, 258) },
  SmartHome: { l: "H", tone: mk(0.72, 0.17, 300) },
  SleepCaps: { l: "S", tone: mk(0.75, 0.17, 342) },
  SKUDS: { l: "K", tone: mk(0.8, 0.12, 178) },
};

/** Цвета для сервисов, которых нет в KNOWN_SERVICES. */
const SPARE_TONES = [mk(0.92, 0.03, 250), mk(0.78, 0.14, 130), mk(0.76, 0.13, 25), mk(0.8, 0.1, 230)];

/** Буква и цвет каждого сервиса; неизвестным — первая свободная буква имени и свободный цвет. */
export function serviceCatalog(services: string[]): Record<string, ServiceInfo> {
  const usedL = new Set<string>();
  const res: Record<string, ServiceInfo> = {};
  let spare = 0;
  for (const name of services) {
    const known = KNOWN_SERVICES[name];
    const candidates = [known?.l, ...name.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "")].filter(Boolean) as string[];
    const l = candidates.find((c) => !usedL.has(c)) ?? "?";
    usedL.add(l);
    const tone = known?.tone ?? SPARE_TONES[spare++ % SPARE_TONES.length];
    res[name] = { name, l, ...tone };
  }
  return res;
}

/** Время жизни дуги атаки, мс. */
export const ARC_LIFE = 2600;
/** Время полёта «головы» дуги, мс. */
export const ARC_TRAVEL = 900;
/** Длительность пульса щита, мс. */
export const SHIELD_LIFE = 3000;
/** Доля окна опроса, по которой раскидываются атаки (хвост — чтобы успели долететь). */
export const SPREAD = 0.85;
/** Ответ старше стольких окон опроса считается устаревшим. */
export const STALE_POLLS = 2;

export const BOWS = [0, 0.13, -0.13, 0.23, -0.23, 0.07, -0.07, 0.18, -0.18];

/** Карточка команды при масштабе 1, px. */
export const CARD_W = 160;
export const CARD_H = 70;
export const TIP_W = 280;
