export const SCENE_SIZE = 1000;
export const CITY_CENTER = { x: 498, y: 519 };
export const TEAM_WIDTH = 126;
export const TEAM_HEIGHT = 100;

/** Центр «базы» относительно левого верхнего угла блока команды (logo-cell). */
export const typeCenterOffset: Record<1 | 2 | 3, { x: number; y: number }> = {
  1: { x: 55, y: 48 },
  2: { x: 72, y: 50 },
  3: { x: 55, y: 49 }
};

export type LabelSide = "top" | "right" | "bottom" | "left";

export type TeamLayout = {
  teamId: number;
  left: number;
  top: number;
  centerX: number;
  centerY: number;
  type: 1 | 2 | 3;
  angle: number;
  labelSide: LabelSide;
};

type LayoutTeam = {
  team_id: number;
  team_pos?: number;
};

const getTeamType = (index: number): 1 | 2 | 3 => {
  return ((index % 3) + 1) as 1 | 2 | 3;
};

const normalizeDeg = (deg: number): number => {
  let value = deg % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
};

export const getLabelSide = (angle: number): LabelSide => {
  const deg = normalizeDeg((angle * 180) / Math.PI);
  if (deg > -135 && deg < -45) return "top";
  if (deg >= -45 && deg <= 45) return "right";
  if (deg > 45 && deg < 135) return "bottom";
  return "left";
};

/**
 * Угол слота на окружности вокруг станции.
 * 2 команды — слева и справа; 3+ — равномерно, первая сверху.
 */
export const getSlotAngle = (index: number, count: number): number => {
  if (count <= 1) return 0;
  if (count === 2) return index === 0 ? Math.PI : 0;
  const start = -Math.PI / 2;
  return start + (2 * Math.PI * index) / count;
};

const computeRadius = (count: number): number => {
  const maxR = 415;
  const preferred = count <= 2 ? 380 : count <= 4 ? 390 : count <= 8 ? 405 : 415;
  if (count <= 1) return preferred;
  const minSpacing = 134;
  const needed = minSpacing / (2 * Math.sin(Math.PI / count));
  return Math.min(maxR, Math.max(preferred, Math.min(needed, maxR)));
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const computeTeamLayouts = (teams: LayoutTeam[]): Map<number, TeamLayout> => {
  const sorted = [...teams].sort(
    (a, b) => (a.team_pos ?? a.team_id) - (b.team_pos ?? b.team_id)
  );
  const count = sorted.length;
  const result = new Map<number, TeamLayout>();
  if (count === 0) return result;

  const radius = computeRadius(count);

  sorted.forEach((team, index) => {
    const angle = getSlotAngle(index, count);
    const type = getTeamType(index);
    const origin = typeCenterOffset[type];
    const centerX = CITY_CENTER.x + radius * Math.cos(angle);
    const centerY = CITY_CENTER.y + radius * Math.sin(angle);
    const left = clamp(centerX - origin.x, 0, SCENE_SIZE - TEAM_WIDTH);
    const top = clamp(centerY - origin.y, 0, SCENE_SIZE - TEAM_HEIGHT);

    result.set(team.team_id, {
      teamId: team.team_id,
      left,
      top,
      centerX: left + origin.x,
      centerY: top + origin.y,
      type,
      angle,
      labelSide: getLabelSide(angle)
    });
  });

  return result;
};
