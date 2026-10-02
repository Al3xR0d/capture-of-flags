import type { Attack, Snapshot, SnapshotTeam } from "../game/types";
import type { ServerResponse, ServerShieldResponse } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Старый API → снапшот борды. Терпим к мусору: битые команды/сервисы/атаки
 * пропускаются; если нет ни одной валидной команды — ответа как бы нет.
 */
export function normalizeScoreboard(raw: unknown): Snapshot | null {
  if (!isObj(raw) || !Array.isArray(raw.TeamData)) return null;
  const res = raw as Partial<ServerResponse>;

  const teams: SnapshotTeam[] = [];
  const attacks: Attack[] = [];
  const services: string[] = [];

  for (const t of res.TeamData ?? []) {
    if (!isObj(t)) continue;
    const id = num(t.team_id);
    if (id == null) continue;

    const status: Record<string, number> = {};
    for (const s of Array.isArray(t.ServData) ? t.ServData : []) {
      if (!isObj(s) || typeof s.serv_name !== "string") continue;
      if (!services.includes(s.serv_name)) services.push(s.serv_name);
      const code = num(s.serv_status);
      if (code != null) status[s.serv_name] = code;
    }

    for (const a of Array.isArray(t.AttackData) ? t.AttackData : []) {
      if (!isObj(a)) continue;
      const to = num(a.victeam_id);
      const flags = num(a.victeam_cflag) ?? 1;
      if (to == null || to === id || flags <= 0) continue;
      const service = typeof a.serv_name === "string" && a.serv_name ? a.serv_name : undefined;
      if (service && !services.includes(service)) services.push(service);
      attacks.push({ from: id, to, flags, service });
    }

    teams.push({
      id,
      name: typeof t.team_name === "string" && t.team_name ? t.team_name : `team-${id}`,
      // Нет team_pos — место по порядку в ответе.
      place: num(t.team_pos) ?? teams.length + 1,
      status,
    });
  }

  if (!teams.length) return null;

  const known = new Set(teams.map((t) => t.id));

  return {
    round: num(res.NumRound),
    teams,
    services,
    attacks: attacks.filter((a) => known.has(a.to)),
  };
}

/** Wazuh → id команд, у которых сработала защита. */
export function normalizeShields(raw: unknown): number[] | null {
  if (!isObj(raw)) return null;
  const ids: number[] = [];
  for (const [key, on] of Object.entries(raw as ServerShieldResponse)) {
    const m = /^team-(\d+)$/.exec(key);
    if (m && on === true) ids.push(Number(m[1]));
  }
  return ids;
}
