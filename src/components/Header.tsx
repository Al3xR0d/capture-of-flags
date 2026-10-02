import type { ConnectionState } from "../game/types";
import type { BoardView } from "../game/view";
import { fmtDuration, plural } from "../game/utils";
import { useNow } from "../hooks/useNow";

interface Props {
  title: string;
  view: BoardView;
  mock: boolean;
}

export function Header({ title, view, mock }: Props) {
  const { teamCount: t, serviceCount: s, timing, paused } = view;
  // На паузе forcad не двигает начало раунда — таймер замирает на последнем значении.
  const now = useNow(1000, !!timing && !paused);

  let roundLeft: number | null = null;
  let gameLeft: number | null = null;
  if (timing) {
    roundLeft = Math.max(0, timing.roundTime - (now - timing.roundStart) / 1000);
    if (timing.totalRounds && view.round != null) {
      gameLeft = Math.max(0, (timing.totalRounds - view.round) * timing.roundTime + roundLeft);
    }
  }
  const roundColor = paused ? "oklch(0.6 0.02 255)" : roundLeft != null && roundLeft <= 10 ? "var(--down)" : undefined;

  return (
    <header className="header">
      <div className="header__brand">
        <div className="logo" aria-hidden>
          <div />
        </div>
        <div className="header__titles">
          <h1 className="header__title">{title}</h1>
          {t > 0 && (
            <div className="header__subtitle">
              {t} {plural(t, "команда", "команды", "команд")} · {s} {plural(s, "сервис", "сервиса", "сервисов")}
            </div>
          )}
        </div>
      </div>

      <div className="header__clock">
        {view.round != null && (
          <div className="stat">
            <div className="stat__label">Раунд</div>
            <div className="stat__value">
              {view.round}
              {timing?.totalRounds ? <span className="stat__total">/{timing.totalRounds}</span> : null}
            </div>
          </div>
        )}
        {roundLeft != null && (
          <>
            <div className="header__divider" />
            <div className="stat">
              <div className="stat__label">До конца раунда</div>
              <div className="stat__value" style={{ color: roundColor }}>
                {fmtDuration(roundLeft)}
              </div>
            </div>
          </>
        )}
        {gameLeft != null && (
          <div className="stat">
            <div className="stat__label">До конца игры</div>
            <div className="stat__value">{fmtDuration(gameLeft)}</div>
          </div>
        )}
        {!timing && view.lastUpdate && (
          <>
            <div className="header__divider" />
            <div className="stat">
              <div className="stat__label">Обновлено</div>
              <div className="stat__value stat__value--sm">{view.lastUpdate}</div>
            </div>
          </>
        )}
      </div>

      <div className="header__status">
        <ConnectionBadge state={view.connection} mock={mock} paused={paused} />
      </div>

      {timing && roundLeft != null && (
        <div
          className="header__progress"
          style={{ width: `${(((timing.roundTime - roundLeft) / timing.roundTime) * 100).toFixed(1)}%` }}
        />
      )}
    </header>
  );
}

const BADGES: Record<ConnectionState, { cls: string; text: string }> = {
  waiting: { cls: "badge--waiting", text: "ПОДКЛЮЧЕНИЕ" },
  live: { cls: "badge--live", text: "LIVE" },
  stale: { cls: "badge--stale", text: "НЕТ СВЯЗИ" },
  offline: { cls: "badge--stale", text: "НЕТ СВЯЗИ" },
};

function ConnectionBadge({ state, mock, paused }: { state: ConnectionState; mock: boolean; paused: boolean }) {
  const b =
    state === "live" && paused
      ? { cls: "badge--paused", text: "ПАУЗА" }
      : mock && state === "live"
        ? { cls: "badge--mock", text: "MOCK" }
        : BADGES[state];
  return (
    <div className={`badge ${b.cls}`} role="status">
      <div className="badge__dot" />
      {b.text}
    </div>
  );
}
