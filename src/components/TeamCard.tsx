import type { CardView } from "../game/view";
import { Avatar } from "./Avatar";

interface Props {
  card: CardView;
  /** Нет в режиме экрана. */
  onEnter?: (id: number) => void;
  onLeave?: (id: number) => void;
}

export function TeamCard({ card: t, onEnter, onLeave }: Props) {
  return (
    <div
      className="team"
      onMouseEnter={onEnter && (() => onEnter(t.id))}
      onMouseLeave={onLeave && (() => onLeave(t.id))}
      style={{
        left: t.x,
        top: t.y,
        transform: `translate(-50%, -50%) scale(${t.scale.toFixed(3)})`,
        opacity: t.opacity,
        zIndex: t.z,
      }}
    >
      <div className="team__body" style={{ borderColor: t.border, background: t.bg, boxShadow: t.shadow }}>
        <div className="team__head">
          <Avatar data={t} size={28} fontSize={11} />
          <div className="team__info">
            <div className="team__name" title={t.name}>
              {t.name}
            </div>
            <div className="team__meta">
              <span className="team__place">
                #{t.place}
                {t.score != null && (
                  <span className="team__delta" style={{ color: t.delta.color }}>
                    {" "}
                    {t.delta.text}
                  </span>
                )}
              </span>
              {t.score != null ? (
                <span className="team__score">{t.score}</span>
              ) : (
                <span className="team__delta" style={{ color: t.delta.color }}>
                  {t.delta.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {t.svcs.length > 0 && (
          <div className="team__svcs" style={{ gridTemplateColumns: `repeat(${t.svcs.length}, 1fr)` }}>
            {t.svcs.map((s) => (
              <div
                key={s.name}
                title={`${s.name}: ${s.label}`}
                className="svc-cell"
                style={{ background: s.bg, color: s.color, border: s.bd }}
              >
                {s.l}
              </div>
            ))}
          </div>
        )}

        {t.mine && <div className="team__tag">ВЫ</div>}
        {t.fbLetters && <div className="team__tag team__tag--fb">1ST BLOOD · {t.fbLetters}</div>}
      </div>
    </div>
  );
}
