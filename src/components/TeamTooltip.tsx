import type { TipView } from "../game/view";
import { Avatar } from "./Avatar";

export function TeamTooltip({ tip, round }: { tip: TipView; round: number | null }) {
  const roundLabel = round != null ? `в раунде ${round}` : "за последнее обновление";
  return (
    <div className="tip" style={{ left: tip.left, top: tip.top }}>
      <div className="tip__head">
        <Avatar data={tip} size={34} fontSize={12} radius={6} />
        <div className="tip__titles">
          <div className="tip__name">{tip.name}</div>
          <div className="tip__meta">
            #{tip.place} <span style={{ color: tip.delta.color }}>{tip.delta.text}</span>
          </div>
        </div>
      </div>

      <div className="tip__stats">
        <div className="tip__stat">
          <div className="tip__stat-label">Украдено флагов</div>
          <div className="tip__stat-value" style={{ color: "var(--up)" }}>+{tip.stolen}</div>
          <div className="tip__stat-total">{roundLabel}</div>
        </div>
        <div className="tip__stat">
          <div className="tip__stat-label">Потеряно флагов</div>
          <div className="tip__stat-value" style={{ color: "var(--down)" }}>−{tip.lost}</div>
          <div className="tip__stat-total">{roundLabel}</div>
        </div>
      </div>

      {tip.victims.length > 0 && <TeamList label="Атаковала" names={tip.victims} />}
      {tip.attackers.length > 0 && <TeamList label="Атакована" names={tip.attackers} />}

      {tip.svcs.length > 0 && (
        <>
          <div className="tip__section">СТАТУС СЕРВИСОВ</div>
          <div className="tip__svcs">
            {tip.svcs.map((s) => (
              <div key={s.name} className="svc-row">
                <div className="svc-row__letter" style={{ background: s.bg, border: s.bd, color: s.color }}>
                  {s.l}
                </div>
                <div className="svc-row__name">{s.name}</div>
                <div className="svc-row__status" style={{ color: s.color }}>
                  {s.short}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TeamList({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="tip__list">
      <span className="tip__list-label">{label}:</span> {names.join(", ")}
    </div>
  );
}
