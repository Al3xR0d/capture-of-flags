import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../assets/styles.css";
import { getRandomMockData, type ServerResponse as MockServerResponse } from "../mockData";
import { computeTeamLayouts } from "../teamLayout";
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

const getDashboardQuery = () => {
  if (typeof window === "undefined") {
    return { useMockData: false, mockTeamCount: 16 };
  }
  const params = new URLSearchParams(window.location.search);
  const teamsParam = Number(params.get("teams"));
  return {
    useMockData: params.get("mock") === "1",
    mockTeamCount: Number.isFinite(teamsParam) && teamsParam > 0 ? teamsParam : 16
  };
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
  const [{ useMockData, mockTeamCount }] = useState(getDashboardQuery);
  const [teams, setTeams] = useState<TeamData[]>([]);
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
  const ARROW_TTL_MS = 4000;
  const SHIELD_TTL_MS = 3000;
  const ARROW_STOP_BEFORE_PX = 48;
  const SHIELD_RADIUS = 56;

  const teamLayouts = useMemo(() => computeTeamLayouts(teams), [teams]);

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

    const getMockShieldData = (teamIds: number[]): ServerShieldResponse => {
      return teamIds.reduce<ServerShieldResponse>((acc, teamId) => {
        acc[`team-${teamId}`] = true;
        return acc;
      }, {});
    };

    const getShieldData = async (teamIds?: number[]) => {
      if (useMockData) {
        const ids =
          teamIds && teamIds.length > 0
            ? teamIds
            : Array.from({ length: mockTeamCount }, (_, index) => index + 1);
        setServerShieldData(getMockShieldData(ids));
        return;
      }

      try {
        const response = await axios.get<ServerShieldResponse>(shieldServerIp);
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
          response = getRandomMockData(mockTeamCount);
        } else {
          // реальный API
          const apiResponse = await axios.get<ServerResponse>(serverIp);
          response = apiResponse.data;
        
        }
        
        setRound(response.NumRound);
        const nextTeams = response.TeamData;
        setTeams(nextTeams);
        setTeamStatuses(prev => {
          const next: Record<
            number,
            Partial<Record<ServiceData["serv_name"], TeamServiceStatus>>
          > = { ...prev };
          nextTeams.forEach(team => {
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
          nextTeams.forEach(team => {
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
  }, [useMockData, mockTeamCount]);

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
            className={`wrapper${teams.length >= 12 ? " teams-many" : ""}`}
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
              const fromPos = teamLayouts.get(arrow.fromTeamId);
              const toPos = teamLayouts.get(arrow.toTeamId);
              if (!fromPos || !toPos) return null;

              return (
                <Arrow
                  key={arrow.id}
                  fromX={fromPos.centerX}
                  fromY={fromPos.centerY}
                  toX={toPos.centerX}
                  toY={toPos.centerY}
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
              const pos = teamLayouts.get(shield.teamId);
              if (!pos) return null;
              return (
                <Shield
                  key={shield.id}
                  cx={pos.centerX}
                  cy={pos.centerY}
                  radius={SHIELD_RADIUS}
                />
              );
            })}
          </svg>
          {teams.map(team => {
            const layout = teamLayouts.get(team.team_id);
            if (!layout) return null;
            const statuses = teamStatuses[team.team_id] || {};
            return (
              <div
                key={team.team_id}
                className={`team team${team.team_id} type-${layout.type}`}
                style={{ top: layout.top, left: layout.left }}
              >
                <p className={`teamName team-label-${layout.labelSide}`}>
                  {team.team_name}
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
