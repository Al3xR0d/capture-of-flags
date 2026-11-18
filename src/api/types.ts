export type TeamServiceStatus = 101 | 102 | 103 | 104 | 110;

export type ServiceData = {
  serv_name: string;
  serv_status: TeamServiceStatus;
};

export type AttackData = {
  victeam_id: number;
  victeam_name: string;
  victeam_cflag: number;
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

export type ServerShieldResponse = Record<string, boolean>;

export type BoardResponse = {
  round: number;
  roundStart: number;
  roundTime: number;
  totalRounds?: number;
  gameRunning: boolean;
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
  firstBloods: {
    serviceId: number;
    attackerId: number;
    victimId: number;
    time: string;
  }[];
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
