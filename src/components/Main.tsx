import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../assets/styles.css";
import { getRandomMockData, type ServerResponse as MockServerResponse } from "../mockData";
import { Arrow } from "./Arrow";
import { Shield } from "./Shield.tsx";

type TeamServiceStatus = 101 | 102 | 103 | 104 | 110;

type ServiceData = {
  serv_name: "VibeAura" | "BioForge" | "SmartHome" | "SleepCaps" | "SKUDS";
  serv_status: TeamServiceStatus;
};

type AttackData = {
  victeam_id: number;
  victeam_name: string;
  victeam_cflag: number;
};

type TeamData = {
  team_id: number;
  team_name: string;
  team_pos: number;
  ServData: ServiceData[];
  AttackData: AttackData[];
};

type ServerResponse = {
  NumRound: number;
  TeamData: TeamData[];
};

type ArrowData = {
  id: string;
  fromTeamId: number;
  toTeamId: number;
  flagCount: number;
  startTime: number;
  endTime: number;
  addedAtMs?: number;
};

type ShieldData = {
  id: string;
  teamId: number;
  startTime: number;
  endTime: number;
  addedAtMs?: number;
};

type ServerShieldResponse = Record<string, boolean>;

const serverIp = "http://10.62.0.120:8000/ctfdata/";
const shieldServerIp = "http://gitlabapps.ctflab.local:8080/ctf-backend/api/wazuh/activity";

const statusTranslate: Record<TeamServiceStatus, string> = {
  101: "green-status",
  102: "blue-status",
  103: "orange-status",
  104: "red-status",
  110: "yellow-status"
};

const flagOffsets = [
  { x: 673, y: 85 },
  { x: 846, y: 236 },
  { x: 934, y: 381 },
  { x: 934, y: 570 },
  { x: 877, y: 691 },
  { x: 763, y: 831 },
  { x: 618, y: 925 },
  { x: 415, y: 925 },
  { x: 222, y: 856 },
  { x: 99, y: 722 },
  { x: 68, y: 546 },
  { x: 60, y: 372 },
  { x: 116, y: 229 },
  { x: 263, y: 146 },
  { x: 460, y: 88 }
];

const typeCenterOffset: Record<1 | 2 | 3, { x: number; y: number }> = {
  1: { x: 5, y: 10 },
  2: { x: 5, y: 10 },
  3: { x: 5, y: 10 }
};

const getTeamTypeById = (teamId: number): 1 | 2 | 3 => {
  return (((teamId - 1) % 3) + 1) as 1 | 2 | 3;
};

const getTeamCenter = (teamId: number) => {
  const base = flagOffsets[teamId - 1];
  const type = getTeamTypeById(teamId);
  const off = typeCenterOffset[type];
  return { x: base.x + off.x, y: base.y + off.y };
};

const extractTeamIdFromShieldKey = (key: string): number | null => {
  const match = key.match(/^team-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export default function MainScreen() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const leftLegendRef = useRef<HTMLImageElement | null>(null);
  const rightLegendRef = useRef<HTMLImageElement | null>(null);
  const [round, setRound] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [useMockData] = useState<boolean>(false); // Переключатель для моковых данных
  const [useTestShieldData] = useState<boolean>(false); // Переключатель для моковых данных щитов
  const [teamStatuses, setTeamStatuses] = useState<
    Record<number, Partial<Record<ServiceData["serv_name"], TeamServiceStatus>>>
  >({});
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [shields, setShields] = useState<ShieldData[]>([]);
  const [serverShieldData, setServerShieldData] = useState<ServerShieldResponse>({});
  const [nowMs, setNowMs] = useState<number>(Date.now());
  // const [lastGoodResponse, setLastGoodResponse] = useState<ServerResponse | null>(null);
  // const [hasError, setHasError] = useState(false);
  const [previousRound, setPreviousRound] = useState<number>(0);
  const [showAttackText, setShowAttackText] = useState<boolean>(true);
  const [attackTextStartTime, setAttackTextStartTime] = useState<number>(Date.now());
  const [teamsThatShowedShields, setTeamsThatShowedShields] = useState<Set<number>>(new Set());
  const ROUND_MS = 150000;
  const ATTACK_MS = 120000;
  const DEFENSE_MS = ROUND_MS - ATTACK_MS;
  const ARROW_TTL_MS = 4000; // время жизни стрелки
  const SHIELD_TTL_MS = 3000; // время жизни одного импульса щита
  const ARROW_STOP_BEFORE_PX = 0; // отступ наконечника до цели
  // const [lastVictimTeamIds, setLastVictimTeamIds] = useState<number[]>([]);

  const teamNames = useMemo(
    () => [
      "T3amW1pe",
      "M3d03d",
      "Some0neCyberS",
      "RedFlagRadar",
      "MeOow5_T3aM_CaT5",
      "researchers_1054",
      "JIEBOE_yXO",
      "AppSECeRS",
      "TA57",
      "Cringe4Shell",
      "Sn4ke_3aters",
      "BI.ZONE Team",
      "SEC.T.A.",
      "Assume Birc",
      "IskIn"
    ],
    []
  );

  useEffect(() => {
    const updateScale = () => {
      const base = 1000; // базовый размер сцены (px)
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const leftLegendWidth = leftLegendRef.current?.getBoundingClientRect().width ?? 0;
      const rightLegendWidth = rightLegendRef.current?.getBoundingClientRect().width ?? 0;
      const horizontalGaps = 80; // gap: 40px слева и справа

      const availableHeight = Math.max(0, window.innerHeight - headerHeight);
      const availableWidth = Math.max(
        0,
        window.innerWidth - leftLegendWidth - rightLegendWidth - horizontalGaps
      );

      const scaleByHeight = availableHeight / base;
      const scaleByWidth = availableWidth / base;
      const nextScale = Math.max(0.5, Math.min(scaleByHeight, scaleByWidth));
      setScale(nextScale);
    };
    updateScale();
    window.addEventListener("resize", updateScale);

    const getShieldData = async () => {
      if (useTestShieldData) {
        // тестовые данные для щитов
        const testData = {
          "team-1": true,   // Команда 1 должна показывать щит
          "team-3": false,  // Команда 3 не должна показывать щит
          "team-4": true,   // Команда 4 должна показывать щит
          "team-7": true,   // Команда 7 должна показывать щит
          "team-12": false, // Команда 12 не должна показывать щит
          "team-15": true   // Команда 15 должна показывать щит
        };
        console.log("Используем тестовые данные щитов:", testData);
        setServerShieldData(testData);
        return;
      }

      try {
        const response = await axios.get<ServerShieldResponse>(shieldServerIp);
        console.log("Данные щитов с сервера:", response.data);
        setServerShieldData(response.data);
      } catch (error) {
        console.error("Ошибка запроса данных щитов: ", error);
        setServerShieldData({});
      }
    };

    const getUpdate = async () => {
      // очистка всех существующих стрелок и щитов при начале нового запроса
      setArrows([]);
      setShields([]);
      
      try {
        let response: ServerResponse | MockServerResponse;
        
        if (useMockData) {
          // моки
          response = getRandomMockData();

     
        } else {
          // реальный API
          const apiResponse = await axios.get<ServerResponse>(serverIp);
          response = apiResponse.data;
        
        }
        
        setRound(response.NumRound);
        const teams = response.TeamData;
        setTeamStatuses(prev => {
          const next: Record<
            number,
            Partial<Record<ServiceData["serv_name"], TeamServiceStatus>>
          > = { ...prev };
          teams.forEach(team => {
            const statuses: Partial<
              Record<ServiceData["serv_name"], TeamServiceStatus>
            > = { ...next[team.team_id] };
          console.log("team:", team)
            team.ServData.forEach(service => {
              statuses[service.serv_name] = service.serv_status;
            });
            next[team.team_id] = statuses;
          });
          return next;
        });

        if (showAttackText && attackTextStartTime > 0) {
          const elapsed = Date.now() - attackTextStartTime;
          const msLeft = Math.max(0, ATTACK_MS - elapsed);
          teams.forEach(team => {
            team.AttackData.forEach(attack => {
              createArrow(team.team_id, attack.victeam_id, attack.victeam_cflag, msLeft);
            });
          });
        }
      } catch (error) {
        console.error("Ошибка запроса: ", error);
      }
    };

    const createArrow = (
      fromTeamId: number,
      toTeamId: number,
      flagCount: number,
      maxDelayMs: number
    ) => {
      const startTime = Math.random() * Math.max(0, maxDelayMs);
      const ttlMs = ARROW_TTL_MS;
      
      const arrowId = `${fromTeamId}-${toTeamId}-${Date.now()}`;
      
      const newArrow: ArrowData = {
        id: arrowId,
        fromTeamId,
        toTeamId,
        flagCount,
        startTime,
        endTime: ttlMs
      };

      // стрелка с задержкой
      setTimeout(() => {
        const appearedAt = Date.now();
        setArrows(prev => [...prev, { ...newArrow, addedAtMs: appearedAt }]);
        setTimeout(() => {
          setArrows(prev => prev.filter(arrow => arrow.id !== arrowId));
        }, ttlMs + 300);
      }, startTime);
    };

    const tickId = window.setInterval(() => setNowMs(Date.now()), 200);
    const pollId = window.setInterval(getUpdate, ROUND_MS);
    const shieldPollId = window.setInterval(getShieldData, ROUND_MS);
    getUpdate();
    getShieldData();

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(tickId);
      window.clearInterval(shieldPollId);
      window.removeEventListener("resize", updateScale);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMockData, useTestShieldData]);

  // Переключение фаз
  useEffect(() => {
    if (showAttackText) {
      setShields([]);
      return;
    }
    setArrows([]);
    setTeamsThatShowedShields(new Set());
    
    const teamsWithShields = Object.entries(serverShieldData)
      .filter(([, shouldShow]) => shouldShow)
      .map(([key]) => extractTeamIdFromShieldKey(key))
      .filter((teamId): teamId is number => teamId !== null);
    
    console.log("Команды с щитами:", teamsWithShields);

    const teamsToShowShields = teamsWithShields.filter(teamId => 
      !teamsThatShowedShields.has(teamId)
    );

    console.log("Команды для показа щитов:", teamsToShowShields);

    const elapsed = Date.now() - attackTextStartTime;
    const msLeftDefense = Math.max(0, DEFENSE_MS - (elapsed - ATTACK_MS));
    
    teamsToShowShields.forEach(teamId => {
      // только один щит для каждой команды
      const delay = Math.random() * msLeftDefense;
      const id = `${teamId}-shield-${Date.now()}-${Math.random()}`;
      setTimeout(() => {
        setShields(prev => [
          ...prev,
          { id, teamId, startTime: delay, endTime: SHIELD_TTL_MS, addedAtMs: Date.now() }
        ]);
        setTeamsThatShowedShields(prev => new Set(prev).add(teamId));
      }, delay);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAttackText, serverShieldData]);

  // чистка просроченных стрелок и щитов, чтобы не зависали
  useEffect(() => {
    setArrows(prev => prev.filter(a => {
      if (!a.addedAtMs) return true;
      return nowMs - a.addedAtMs <= a.endTime + 250;
    }));
    setShields(prev => prev.filter(s => {
      if (!s.addedAtMs) return true;
      return nowMs - s.addedAtMs <= s.endTime + 250;
    }));
  }, [nowMs]);

  // Отслеживание смены раунда и показ надписи АТАКА
  useEffect(() => {
    if (round !== previousRound && previousRound !== 0) {
      setShowAttackText(true);
      setAttackTextStartTime(Date.now());
      setTeamsThatShowedShields(new Set());
    }
    setPreviousRound(round);
  }, [round, previousRound]);

  // Автоматическое скрытие надписи АТАКА через ATTACK_MS миллисекунд
  useEffect(() => {
    if (showAttackText && attackTextStartTime > 0) {
      const elapsed = nowMs - attackTextStartTime;
      if (elapsed >= ATTACK_MS) {
        setShowAttackText(false);
      }
    }
  }, [nowMs, showAttackText, attackTextStartTime, ATTACK_MS]);

  return (
    <div className="main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 id="roundNum" ref={headerRef}>{`Round ${round}`}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        </div>
      </div>
      <div className="flex">
        <img className="legend legend-services" ref={leftLegendRef} src="legend_services.png" alt="" />
        <div
          className="wrapper-outer"
          style={{ width: 1000 * scale, height: 1000 * scale }}
        >
          <div
            className="wrapper"
            id="wrapper"
            ref={wrapperRef}
            style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
          <div className="city" />

          <svg
            className="arrows-container"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 20
            }}
          >
            {showAttackText && arrows.map(arrow => {
              const fromPos = getTeamCenter(arrow.fromTeamId);
              const toPos = getTeamCenter(arrow.toTeamId);
              
              return (
                <Arrow
                  key={arrow.id}
                  fromX={fromPos.x}
                  fromY={fromPos.y}
                  toX={toPos.x}
                  toY={toPos.y}
                  flagCount={arrow.flagCount}
                  isAnimated={true}
                  stopBeforePx={ARROW_STOP_BEFORE_PX}
                />
              );
            })}
          </svg>

          <svg
            className="shields-container"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 18
            }}
          >
            {!showAttackText && shields.map(shield => {
              const pos = getTeamCenter(shield.teamId);
              return (
                <Shield key={shield.id} cx={pos.x} cy={pos.y} radius={56} />
              );
            })}
          </svg>
          {[...Array(15)].map((_, idx) => {
            const teamIndex = idx + 1;
            const typeClass = (idx % 3 + 1) as 1 | 2 | 3;
            const extra = [8, 9, 10, 11, 12, 13, 14].includes(teamIndex)
              ? " alt-name"
              : "";
            const statuses = teamStatuses[teamIndex] || {};
            return (
              <div
                key={teamIndex}
                className={`team team${teamIndex}${extra} type-${typeClass}`}
              >
                <p className="teamName">
                  {teamNames[idx] || ""}
                </p>
                <div
                  className={`service-status v-cell ${statuses["VibeAura"]
                    ? statusTranslate[statuses["VibeAura"]] as string
                    : ""}`}
                >
                  <div className="service v" />
                </div>
                <div
                  className={`service-status c-cell ${statuses["SKUDS"]
                    ? statusTranslate[statuses["SKUDS"]] as string
                    : ""}`}
                >
                  <div className="service c" />
                </div>
                <div
                  className={`service-status s-cell ${statuses["SleepCaps"]
                    ? statusTranslate[statuses["SleepCaps"]] as string
                    : ""}`}
                >
                  <div className="service s" />
                </div>
                <div
                  className={`service-status b-cell ${statuses["BioForge"]
                    ? statusTranslate[statuses["BioForge"]] as string
                    : ""}`}
                >
                  <div className="service b" />
                </div>
                <div
                  className={`service-status o-cell ${statuses["SmartHome"]
                    ? statusTranslate[statuses["SmartHome"]] as string
                    : ""}`}
                >
                  <div className="service o" />
                </div>
                <div className="service-status logo-cell" />
              </div>
            );
          })}
          </div>
        </div>
        <div className="attack-defence-container">
        <img className="legend legend-statuses" ref={rightLegendRef} src="legend_statuses.png" alt="" />
        <div className={`phase-badge ${showAttackText ? 'attack' : 'defense'}`}>
          {showAttackText ? 'АТАКА' : 'ЗАЩИТА'}
        </div>
        </div>
      </div>
    </div>
  );
}
