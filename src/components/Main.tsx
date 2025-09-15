import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../assets/styles.css";
import { getRandomMockData, type ServerResponse as MockServerResponse } from "../mockData";

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

        teams.forEach(team => {
          team.AttackData.forEach(attack => {
            makeFlag(team.team_id, attack.victeam_id, attack.victeam_cflag);
          });
        });
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

          teams.forEach(team => {
            team.AttackData.forEach(attack => {
              makeFlag(team.team_id, attack.victeam_id, attack.victeam_cflag);
            });
          });
        }
      }
    };

    const makeFlag = (
      teamId: number,
      victeamId: number,
      victeam_cflag: number
    ) => {
      if (!wrapperRef.current) return;
      const flag = document.createElement("div");
      flag.classList.add("flag");
      flag.textContent = victeam_cflag.toString();
      flag.style.left = `${flagOffsets[victeamId - 1].x}px`;
      flag.style.top = `${flagOffsets[victeamId - 1].y}px`;
      wrapperRef.current.appendChild(flag);

      const startTime = Math.random() * 59000;
      const endTime = 54500 - startTime;

      setTimeout(() => {
        flag.style.left = `${flagOffsets[teamId - 1].x}px`;
        flag.style.top = `${flagOffsets[teamId - 1].y}px`;
        setTimeout(() => {
          flag.remove();
        }, endTime);
      }, startTime);
    };

    // DOM-манипуляции для статусов заменены на управление через состояние в JSX ниже

    const intervalId = window.setTimeout(getUpdate, 60000);
    getUpdate();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", updateScale);
    };
  }, [useMockData]);

  // Имена команд рендерятся напрямую из массива teamNames

  return (
    <div className="main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 id="roundNum" ref={headerRef}>{`Round ${round}`}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
        <img className="legend legend-statuses" ref={rightLegendRef} src="/src/assets/legend_statuses.png" alt="" />
      </div>
    </div>
  );
}
