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

/** Буквы для известных сервисов; для остальных — первая свободная буква имени. */
const SERVICE_LETTERS: Record<string, string> = {
  VibeAura: "V",
  BioForge: "B",
  SmartHome: "H",
  SleepCaps: "S",
  SKUDS: "K",
};

export function serviceLetters(services: string[]): Record<string, string> {
  const used = new Set<string>();
  const res: Record<string, string> = {};
  for (const name of services) {
    const candidates = [SERVICE_LETTERS[name], ...name.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "")].filter(Boolean);
    const l = candidates.find((c) => !used.has(c)) ?? "?";
    used.add(l);
    res[name] = l;
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
