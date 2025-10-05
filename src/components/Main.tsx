import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../assets/styles.css";
import { getRandomMockData, type ServerResponse as MockServerResponse } from "../mockData";
import { Arrow } from "./Arrow";
import { Shield } from "./Shield.tsx";

type TeamServiceStatus = 101 | 102 | 103 | 104 | 110;

type ServiceData = {
  serv_name: "V.B0ARD" | "B0i1RUM" | "0BCA5" | "SMR+B1BNC" | "CTR1PANEL";
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

const serverIp = "http://10.61.0.12:20000/ctfdata/";

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

// Сместить координаты к центру центрального гекса спрайтов type-1/2/3
// Значения подобраны эмпирически относительно left/top блока .team (126x100)
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

export default function MainScreen() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const leftLegendRef = useRef<HTMLImageElement | null>(null);
  const rightLegendRef = useRef<HTMLImageElement | null>(null);
  const [round, setRound] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [useMockData, setUseMockData] = useState<boolean>(true); // Переключатель для моковых данных
  const [teamStatuses, setTeamStatuses] = useState<
    Record<number, Partial<Record<ServiceData["serv_name"], TeamServiceStatus>>>
  >({});
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [shields, setShields] = useState<ShieldData[]>([]);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const ROUND_MS = 60000;
  const ATTACK_MS = 40000;
  const DEFENSE_MS = ROUND_MS - ATTACK_MS;
  const ARROW_TTL_MS = 4000; // время жизни стрелки
  const SHIELD_TTL_MS = 3000; // время жизни одного импульса щита
  const ARROW_STOP_BEFORE_PX = 0; // отступ наконечника до цели
  const [lastVictimTeamIds, setLastVictimTeamIds] = useState<number[]>([]);

  const timeInRound = nowMs % ROUND_MS;
  const isAttackPhase = timeInRound < ATTACK_MS;
  
  const teamNames = useMemo(
    () => [
      "t3amw1pe",
      "BBhunt3rs",
      "TA-57",
      "Cringe4Shell",
      "Data361",
      "SIGWIN",
      "Sorokin_team",
      "CSLab",
      "CryptoHUB",
      "S0me0neCyberS",
      "GPT_in_team",
      "DirtyPipe",
      "Fail2ban",
      "f1agsR3AP3RS",
      "OKKO"
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

    const getUpdate = async () => {
      // Локальная фаза раунда (без зависимости от состояния)
      const now = Date.now();
      const timeInRoundLocal = now % ROUND_MS;
      const isAttackPhaseLocal = timeInRoundLocal < ATTACK_MS;
      // Очищаем все существующие стрелки и щиты при начале нового запроса
      setArrows([]);
      setShields([]);
      
      try {
        let response: ServerResponse | MockServerResponse;
        
        if (useMockData) {
          // Используем моковые данные
          response = getRandomMockData();

          console.log(response)
        } else {
          // Используем реальный API
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
            team.ServData.forEach(service => {
              statuses[service.serv_name] = service.serv_status;
            });
            next[team.team_id] = statuses;
          });
          return next;
        });

        const victims: number[] = [];
        teams.forEach(team => {
          team.AttackData.forEach(attack => {
            victims.push(attack.victeam_id);
          });
        });
        setLastVictimTeamIds(Array.from(new Set(victims)));

        // Планируем стрелки только в фазе атаки
        if (isAttackPhaseLocal) {
          const msLeft = ATTACK_MS - (timeInRoundLocal % ATTACK_MS);
          teams.forEach(team => {
            team.AttackData.forEach(attack => {
              createArrow(team.team_id, attack.victeam_id, attack.victeam_cflag, msLeft);
            });
          });
        }
      } catch (error) {
        console.error("Ошибка запроса: ", error);
        // В случае ошибки используем моковые данные как fallback
        if (!useMockData) {
          const fallbackData = getRandomMockData();
          setRound(fallbackData.NumRound);
          const teams = fallbackData.TeamData;
          setTeamStatuses(prev => {
            const next: Record<
              number,
              Partial<Record<ServiceData["serv_name"], TeamServiceStatus>>
            > = { ...prev };
            teams.forEach(team => {
              const statuses: Partial<
                Record<ServiceData["serv_name"], TeamServiceStatus>
              > = { ...next[team.team_id] };
              team.ServData.forEach(service => {
                statuses[service.serv_name] = service.serv_status;
              });
              next[team.team_id] = statuses;
            });
            return next;
          });

          const victims: number[] = [];
          teams.forEach(team => {
            team.AttackData.forEach(attack => {
              victims.push(attack.victeam_id);
            });
          });
          setLastVictimTeamIds(Array.from(new Set(victims)));

          if (isAttackPhaseLocal) {
            const msLeft = ATTACK_MS - (timeInRoundLocal % ATTACK_MS);
            teams.forEach(team => {
              team.AttackData.forEach(attack => {
                createArrow(team.team_id, attack.victeam_id, attack.victeam_cflag, msLeft);
              });
            });
          }
        }
      }
    };

    const createArrow = (
      fromTeamId: number,
      toTeamId: number,
      flagCount: number,
      maxDelayMs: number
    ) => {
      const startTime = Math.random() * Math.max(0, maxDelayMs); // задержка в пределах фазы атаки
      const ttlMs = ARROW_TTL_MS; // время жизни стрелки после появления
      
      const arrowId = `${fromTeamId}-${toTeamId}-${Date.now()}`;
      
      const newArrow: ArrowData = {
        id: arrowId,
        fromTeamId,
        toTeamId,
        flagCount,
        startTime,
        endTime: ttlMs
      };

      // Добавляем стрелку с задержкой
      setTimeout(() => {
        const appearedAt = Date.now();
        setArrows(prev => [...prev, { ...newArrow, addedAtMs: appearedAt }]);
        // Жёсткое удаление по TTL на случай пропуска периодической чистки
        setTimeout(() => {
          setArrows(prev => prev.filter(arrow => arrow.id !== arrowId));
        }, ttlMs + 300);
      }, startTime);
    };

    // DOM-манипуляции для статусов заменены на управление через состояние в JSX ниже

    const tickId = window.setInterval(() => setNowMs(Date.now()), 200);
    const pollId = window.setInterval(getUpdate, ROUND_MS);
    getUpdate();

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(tickId);
      window.removeEventListener("resize", updateScale);
    };
  }, [useMockData]);

  // Переключение фаз: в защитной фазе показываем щиты у последних жертв
  useEffect(() => {
    // Этот эффект реагирует только на смену фазы
    if (isAttackPhase) {
      setShields([]);
      return;
    }
    // Фаза защиты: убираем стрелки, показываем импульсы щита
    setArrows([]);
    const msIntoDefense = timeInRound - ATTACK_MS;
    const msLeftDefense = Math.max(0, DEFENSE_MS - msIntoDefense);
    const pulsesPerTeam = 3;
    lastVictimTeamIds.forEach(teamId => {
      for (let i = 0; i < pulsesPerTeam; i++) {
        const delay = Math.random() * msLeftDefense;
        const id = `${teamId}-shield-${Date.now()}-${i}-${Math.random()}`;
        setTimeout(() => {
          setShields(prev => [
            ...prev,
            { id, teamId, startTime: delay, endTime: SHIELD_TTL_MS, addedAtMs: Date.now() }
          ]);
        }, delay);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAttackPhase]);

  // Периодическая чистка просроченных стрелок и щитов, чтобы не зависали
  useEffect(() => {
    setArrows(prev => prev.filter(a => {
      if (!a.addedAtMs) return true;
      return nowMs - a.addedAtMs <= a.endTime + 250; // небольшой буфер
    }));
    setShields(prev => prev.filter(s => {
      if (!s.addedAtMs) return true;
      return nowMs - s.addedAtMs <= s.endTime + 250;
    }));
  }, [nowMs]);

  return (
    <div className="main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 id="roundNum" ref={headerRef}>{`Round ${round}`}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* <div className={`phase-badge ${isAttackPhase ? 'attack' : 'defense'}`}>
          {isAttackPhase ? 'АТАКА' : 'ЗАЩИТА'}
        </div> */}
          <label style={{ color: 'white', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Использовать моковые данные
          </label>
        </div>
      </div>
      <div className="flex">
        <img className="legend legend-services" ref={leftLegendRef} src="/src/assets/legend_services.png" alt="" />
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
          
          {/* SVG контейнер для стрелок */}
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
            {isAttackPhase && arrows.map(arrow => {
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
          {/* SVG контейнер для щитов */}
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
            {!isAttackPhase && shields.map(shield => {
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
                  className={`service-status v-cell ${statuses["V.B0ARD"]
                    ? statusTranslate[statuses["V.B0ARD"]] as string
                    : ""}`}
                >
                  <div className="service v" />
                </div>
                <div
                  className={`service-status c-cell ${statuses["CTR1PANEL"]
                    ? statusTranslate[statuses["CTR1PANEL"]] as string
                    : ""}`}
                >
                  <div className="service c" />
                </div>
                <div
                  className={`service-status s-cell ${statuses["SMR+B1BNC"]
                    ? statusTranslate[statuses["SMR+B1BNC"]] as string
                    : ""}`}
                >
                  <div className="service s" />
                </div>
                <div
                  className={`service-status b-cell ${statuses["B0i1RUM"]
                    ? statusTranslate[statuses["B0i1RUM"]] as string
                    : ""}`}
                >
                  <div className="service b" />
                </div>
                <div
                  className={`service-status o-cell ${statuses["0BCA5"]
                    ? statusTranslate[statuses["0BCA5"]] as string
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
        <img className="legend legend-statuses" ref={rightLegendRef} src="/src/assets/legend_statuses.png" alt="" />
        <div className={`phase-badge ${isAttackPhase ? 'attack' : 'defense'}`}>
          {isAttackPhase ? 'АТАКА' : 'ЗАЩИТА'}
        </div>
        </div>
      </div>
    </div>
  );
}
