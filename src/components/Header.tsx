import type { ConnectionState } from "../game/types";
import type { BoardView } from "../game/view";
import { plural } from "../game/utils";

interface Props {
  title: string;
  view: BoardView;
  mock: boolean;
}

export function Header({ title, view, mock }: Props) {
  const { teamCount: t, serviceCount: s } = view;
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
            <div className="stat__value">{view.round}</div>
          </div>
        )}
        {view.lastUpdate && (
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
        <ConnectionBadge state={view.connection} mock={mock} />
      </div>
    </header>
  );
}

const BADGES: Record<ConnectionState, { cls: string; text: string }> = {
  waiting: { cls: "badge--waiting", text: "ПОДКЛЮЧЕНИЕ" },
  live: { cls: "badge--live", text: "LIVE" },
  stale: { cls: "badge--stale", text: "НЕТ СВЯЗИ" },
  offline: { cls: "badge--stale", text: "НЕТ СВЯЗИ" },
};

function ConnectionBadge({ state, mock }: { state: ConnectionState; mock: boolean }) {
  const b = mock && state === "live" ? { cls: "badge--mock", text: "MOCK" } : BADGES[state];
  return (
    <div className={`badge ${b.cls}`} role="status">
      <div className="badge__dot" />
      {b.text}
    </div>
  );
}
