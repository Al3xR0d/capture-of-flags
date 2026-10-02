import type { ServerResponse } from "./types";

/** Базовый снапшот старого API — 30 команд, 5 сервисов. */
export const mockData: ServerResponse = {
  NumRound: 42,
  TeamData: [
    {
      team_id: 1,
      team_name: "t3amw1pe",
      team_pos: 1,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 102 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 103 }
      ],
      AttackData: [
        { victeam_id: 2, victeam_name: "M3d03d", victeam_cflag: 1 },
        { victeam_id: 5, victeam_name: "MeOow5_T3aM_CaT5", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 2,
      team_name: "BBhunt3rs",
      team_pos: 2,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 102 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 104 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 3, victeam_name: "Some0neCyberS", victeam_cflag: 1 },
        { victeam_id: 7, victeam_name: "JIEBOE_yXO", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 3,
      team_name: "TA-57",
      team_pos: 3,
      ServData: [
        { serv_name: "VibeAura", serv_status: 103 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 102 }
      ],
      AttackData: [
        { victeam_id: 1, victeam_name: "T3amW1pe", victeam_cflag: 1 },
        { victeam_id: 4, victeam_name: "RedFlagRadar", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 4,
      team_name: "Cringe4Shell",
      team_pos: 4,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 104 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 },
        { victeam_id: 8, victeam_name: "AppSECeRS", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 5,
      team_name: "Data361",
      team_pos: 5,
      ServData: [
        { serv_name: "VibeAura", serv_status: 102 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 103 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 2, victeam_name: "M3d03d", victeam_cflag: 1 },
        { victeam_id: 9, victeam_name: "TA57", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 6,
      team_name: "SIGWIN",
      team_pos: 6,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 102 },
        { serv_name: "SKUDS", serv_status: 103 }
      ],
      AttackData: [
        { victeam_id: 4, victeam_name: "RedFlagRadar", victeam_cflag: 1 },
        { victeam_id: 10, victeam_name: "Cringe4Shell", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 7,
      team_name: "Sorokin_team",
      team_pos: 7,
      ServData: [
        { serv_name: "VibeAura", serv_status: 104 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 2, victeam_name: "M3d03d", victeam_cflag: 1 },
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 8,
      team_name: "CSLab",
      team_pos: 8,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 103 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 4, victeam_name: "RedFlagRadar", victeam_cflag: 1 },
        { victeam_id: 12, victeam_name: "BI.ZONE Team", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 9,
      team_name: "CryptoHUB",
      team_pos: 9,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 102 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 5, victeam_name: "MeOow5_T3aM_CaT5", victeam_cflag: 1 },
        { victeam_id: 13, victeam_name: "SEC.T.A.", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 10,
      team_name: "S0me0neCyberS",
      team_pos: 10,
      ServData: [
        { serv_name: "VibeAura", serv_status: 102 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 103 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 },
        { victeam_id: 14, victeam_name: "Assume Birc", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 11,
      team_name: "GPT_in_team",
      team_pos: 11,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 104 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 7, victeam_name: "JIEBOE_yXO", victeam_cflag: 1 },
        { victeam_id: 15, victeam_name: "IskIn", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 12,
      team_name: "DirtyPipe",
      team_pos: 12,
      ServData: [
        { serv_name: "VibeAura", serv_status: 103 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 102 }
      ],
      AttackData: [
        { victeam_id: 8, victeam_name: "AppSECeRS", victeam_cflag: 1 },
        { victeam_id: 1, victeam_name: "T3amW1pe", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 13,
      team_name: "Fail2ban",
      team_pos: 13,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 104 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 9, victeam_name: "TA57", victeam_cflag: 1 },
        { victeam_id: 3, victeam_name: "Some0neCyberS", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 14,
      team_name: "f1agsR3AP3RS",
      team_pos: 14,
      ServData: [
        { serv_name: "VibeAura", serv_status: 101 },
        { serv_name: "BioForge", serv_status: 102 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 10, victeam_name: "Cringe4Shell", victeam_cflag: 1 },
        { victeam_id: 5, victeam_name: "MeOow5_T3aM_CaT5", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 15,
      team_name: "OKKO",
      team_pos: 15,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 16,
      team_name: "OKKO1",
      team_pos: 16,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 17,
      team_name: "OKKO2",
      team_pos: 17,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 18,
      team_name: "OKKO3",
      team_pos: 18,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 19,
      team_name: "OKKO4",
      team_pos: 19,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 20,
      team_name: "OKKO5",
      team_pos: 20,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 21,
      team_name: "OKKO6",
      team_pos: 21,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 22,
      team_name: "OKKO7",
      team_pos: 22,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 23,
      team_name: "OKKO8",
      team_pos: 23,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 24,
      team_name: "OKKO9",
      team_pos: 24,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 25,
      team_name: "OKKO10",
      team_pos: 25,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 26,
      team_name: "OKKO11",
      team_pos: 26,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 27,
      team_name: "OKKO12",
      team_pos: 27,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 28,
      team_name: "OKKO13",
      team_pos: 28,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 29,
      team_name: "OKKO14",
      team_pos: 29,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    },
    {
      team_id: 30,
      team_name: "OKKO15",
      team_pos: 30,
      ServData: [
        { serv_name: "VibeAura", serv_status: 110 },
        { serv_name: "BioForge", serv_status: 101 },
        { serv_name: "SmartHome", serv_status: 101 },
        { serv_name: "SleepCaps", serv_status: 101 },
        { serv_name: "SKUDS", serv_status: 101 }
      ],
      AttackData: [
        { victeam_id: 11, victeam_name: "Sn4ke_3aters", victeam_cflag: 1 },
        { victeam_id: 6, victeam_name: "researchers_1054", victeam_cflag: 1 }
      ]
    }
  ]
};
