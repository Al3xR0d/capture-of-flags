/**
 * Контракт старого API борды (GET /ctfdata/ и Wazuh activity).
 * Не менять без бэкенда — нормализация в normalize.ts.
 */

/** Статусы чекера ForcAD: 101 UP, 102 CORRUPT, 103 MUMBLE, 104 DOWN, 110 CHECK FAILED. */
export type TeamServiceStatus = 101 | 102 | 103 | 104 | 110;

export type ServiceData = {
  serv_name: string;
  serv_status: TeamServiceStatus;
};

export type AttackData = {
  victeam_id: number;
  victeam_name: string;
  /** Сколько флагов украдено у жертвы. */
  victeam_cflag: number;
  /** Через какой сервис украдены флаги (опционально — тогда дуга нейтрального цвета). */
  serv_name?: string;
};

export type TeamData = {
  team_id: number;
  team_name: string;
  team_pos: number;
  ServData: ServiceData[];
  AttackData: AttackData[];
};

export type ServerResponse = {
  NumRound: number;
  TeamData: TeamData[];
};

/** Wazuh: `{ "team-1": true, "team-2": false, ... }`. */
export type ServerShieldResponse = Record<string, boolean>;

/**
 * Бэкенд борды (ctf-board-backend): GET /api/board и SSE /api/stream
 * (`event: board` — этот же снапшот, `event: attacks` — BoardAttackBatch).
 */
export type BoardResponse = {
  round: number;
  /** unix, с */
  roundStart: number;
  /** с */
  roundTime: number;
  totalRounds?: number;
  gameRunning: boolean;
  /** unix, мс — для поправки на сдвиг часов */
  serverTime: number;
  services: { id: number; name: string }[];
  teams: {
    id: number;
    name: string;
    place: number;
    score: number;
    stolen: number;
    lost: number;
    services: {
      serviceId: number;
      status: number;
      sla: number;
      score: number;
      stolen: number;
      lost: number;
      message?: string;
    }[];
    firstBloods: number[];
  }[];
  firstBloods: { serviceId: number; attackerId: number; victimId: number; time: string }[];
  roundAttacks: BoardAttack[];
};

export type BoardAttack = {
  from: number;
  to: number;
  serviceId: number;
  flags: number;
  points: number;
  firstBlood?: boolean;
  round: number;
};

export type BoardAttackBatch = {
  attacks: BoardAttack[];
  dropped?: number;
};
