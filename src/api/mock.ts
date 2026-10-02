import { mockData } from "./mockData";
import type { AttackData, ServerResponse, ServerShieldResponse, TeamData, TeamServiceStatus } from "./types";

const pickStatus = (): TeamServiceStatus => {
  const r = Math.random();
  return r < 0.7 ? 101 : r < 0.8 ? 104 : r < 0.88 ? 103 : r < 0.94 ? 102 : 110;
};

/**
 * Генератор моков в формате старого API: берёт первые `teamCount` команд
 * из mockData, на каждый вызов увеличивает раунд, слегка перемешивает места,
 * статусы и атаки.
 */
export function createMockScoreboard(teamCount: number) {
  const count = Math.max(2, Math.min(teamCount, mockData.TeamData.length));
  const base = mockData.TeamData.slice(0, count);
  let round = mockData.NumRound;
  let order = base.map((t) => t.team_id);
  const statuses = new Map(base.map((t) => [t.team_id, t.ServData.map((s) => s.serv_status)]));

  return (): ServerResponse => {
    round++;
    // Пара соседних мест меняется местами — чтобы были ↑/↓.
    for (let i = 0; i < 3; i++) {
      const k = Math.floor(Math.random() * (order.length - 1));
      order = [...order];
      [order[k], order[k + 1]] = [order[k + 1], order[k]];
    }

    const TeamData: TeamData[] = base.map((team) => {
      const st = statuses.get(team.team_id)!.map((s) => (Math.random() < 0.2 ? pickStatus() : s));
      statuses.set(team.team_id, st);

      const attacks: AttackData[] = [];
      const n = Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const victim = base[Math.floor(Math.random() * base.length)];
        if (victim.team_id === team.team_id || attacks.some((a) => a.victeam_id === victim.team_id)) continue;
        const vst = statuses.get(victim.team_id)!;
        const open = victim.ServData.filter((_, k) => vst[k] !== 104);
        if (!open.length) continue;
        attacks.push({
          victeam_id: victim.team_id,
          victeam_name: victim.team_name,
          victeam_cflag: 1 + Math.floor(Math.random() * 3),
          serv_name: open[Math.floor(Math.random() * open.length)].serv_name,
        });
      }

      return {
        team_id: team.team_id,
        team_name: team.team_name,
        team_pos: order.indexOf(team.team_id) + 1,
        ServData: team.ServData.map((s, k) => ({ serv_name: s.serv_name, serv_status: st[k] })),
        AttackData: attacks,
      };
    });

    return { NumRound: round, TeamData };
  };
}

/** Моки Wazuh: ~30% команд «защищались» в этом раунде. */
export function createMockShields(teamCount: number) {
  const count = Math.max(2, Math.min(teamCount, mockData.TeamData.length));
  return (): ServerShieldResponse => {
    const res: ServerShieldResponse = {};
    for (let id = 1; id <= count; id++) res[`team-${id}`] = Math.random() < 0.3;
    return res;
  };
}
