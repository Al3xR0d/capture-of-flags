import { STATUS, STATUS_ORDER } from "../game/constants";
import type { BoardEngine } from "../game/engine";
import type { BoardView, RankRow } from "../game/view";
import { Avatar } from "./Avatar";

interface Props {
  engine: BoardEngine;
  view: BoardView;
}

export function Sidebar({ engine, view }: Props) {
  return (
    <aside className="sidebar">
      {view.top.length > 0 && <Ranking view={view} />}
      {view.mode === "interactive" && view.teamOptions.length > 0 && <Filters engine={engine} view={view} />}
      <Legend view={view} />
    </aside>
  );
}

function Ranking({ view }: { view: BoardView }) {
  return (
    <section className="panel">
      <h2 className="panel__title">ТОП-{view.topN}</h2>
      <ol className="ranking">
        {view.top.map((r) => (
          <RankItem key={r.id} row={r} />
        ))}
        {view.myRow && <RankItem row={view.myRow} detached />}
      </ol>
    </section>
  );
}

function RankItem({ row: r, detached = false }: { row: RankRow; detached?: boolean }) {
  const cls = ["rank-row", r.mine && "rank-row--mine", detached && "rank-row--detached"].filter(Boolean).join(" ");
  return (
    <li className={cls}>
      <div className="rank-row__place">{r.place}</div>
      <div className="rank-row__delta" style={{ color: r.delta.color }}>
        {r.delta.text}
      </div>
      <Avatar data={r} size={26} fontSize={10} />
      <div className="rank-row__name">{r.name}</div>
    </li>
  );
}

function Filters({ engine, view }: Props) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">ФИЛЬТР АТАК</h2>
        {view.teamFilter != null && (
          <button type="button" className="link-btn" onClick={() => engine.setTeamFilter(null)}>
            сбросить
          </button>
        )}
      </div>
      <label className="field-label" htmlFor="team-filter">
        Команда
      </label>
      <select
        id="team-filter"
        className="select"
        value={view.teamFilter == null ? "" : String(view.teamFilter)}
        onChange={(e) => engine.setTeamFilter(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Все команды</option>
        {view.teamOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </section>
  );
}

function Legend({ view }: { view: BoardView }) {
  return (
    <section className="panel panel--scroll">
      {view.services.length > 0 && (
        <>
          <h2 className="panel__title">{view.attackColors ? "СЕРВИСЫ · ЦВЕТ АТАКИ" : "СЕРВИСЫ"}</h2>
          <div className="legend-grid">
            {view.services.map((s) => (
              <div key={s.name} className="svc-legend">
                <div className="svc-legend__letter" style={{ borderColor: s.c, color: s.c }}>
                  {s.l}
                </div>
                <div className="svc-legend__name">{s.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={`panel__title${view.services.length ? " panel__title--spaced" : ""}`}>СТАТУС СЕРВИСА</h2>
      <div className="legend-grid legend-grid--mono">
        {STATUS_ORDER.map((code) => {
          const s = STATUS[code];
          return (
            <div key={code} className="status-legend">
              <div className="status-legend__swatch" style={{ background: s.a(0.2), border: `1px solid ${s.a(0.55)}` }} />
              <span style={{ color: s.c }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <h2 className="panel__title panel__title--spaced">ОБОЗНАЧЕНИЯ</h2>
      <ul className="notation">
        <li>
          <div className="notation__arc">
            <span>{view.attackColors ? "×" : "2"}</span>
          </div>
          {view.attackColors ? "Атака цветом сервиса, ×N — украдено флагов" : "Атака, число — украдено флагов"}
        </li>
        <li>
          <div className="notation__box notation__box--attacked" />
          Команда атакована
        </li>
        {view.showShieldLegend && (
          <li>
            <div className="notation__box notation__box--shield" />
            Сработала защита (Wazuh)
          </li>
        )}
        {view.hasMyTeam && (
          <li>
            <div className="notation__box notation__box--mine" />
            Ваша команда
          </li>
        )}
      </ul>
      {view.mode === "interactive" && (
        <p className="hint">Наведите на команду, чтобы увидеть её атаки за раунд.</p>
      )}
    </section>
  );
}
