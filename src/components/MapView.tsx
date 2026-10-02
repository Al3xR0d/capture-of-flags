import { useCallback, useEffect, useRef } from "react";
import type { BoardEngine } from "../game/engine";
import type { BoardView } from "../game/view";
import Radar from "./Radar";
import { TeamCard } from "./TeamCard";
import { TeamTooltip } from "./TeamTooltip";

interface Props {
  engine: BoardEngine;
  view: BoardView;
}

export function MapView({ engine, view }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      engine.setSize(r.width, r.height);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [engine]);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (canvasRef.current) engine.draw(canvasRef.current, now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const onEnter = useCallback((id: number) => engine.setHover(id), [engine]);
  const onLeave = useCallback((id: number) => engine.leave(id), [engine]);
  const interactive = view.mode === "interactive";

  return (
    <div ref={mapRef} className="map">
      <div className="map__radar" aria-hidden>
        <Radar
          color="#00ff9d"
          speed={0.6}
          spokeCount={9}
          falloff={0.1}
          brightness={0.3}
          sweepSpeed={5}
          mouseInfluence={1}
          enableMouseInteraction={false}
        />
      </div>
      <div className="map__grid" aria-hidden />
      <canvas ref={canvasRef} className="map__arcs" aria-hidden />

      {view.cards.map((c) => (
        <TeamCard
          key={c.id}
          card={c}
          onEnter={interactive ? onEnter : undefined}
          onLeave={interactive ? onLeave : undefined}
        />
      ))}

      {view.tip && <TeamTooltip tip={view.tip} round={view.round} />}

      {view.paused && view.cards.length > 0 && (
        <div className="pause" role="status">
          <div className="pause__title">ПАУЗА</div>
          <div className="pause__text">Игра приостановлена организаторами</div>
        </div>
      )}

      {view.cards.length === 0 && (
        <div className="map__empty" role="status">
          {view.connection === "offline" ? (
            <>
              <div className="map__empty-title">НЕТ ДАННЫХ</div>
              <div className="map__empty-text">API табло не отвечает, повторим на следующем опросе</div>
            </>
          ) : (
            <div className="map__empty-title">ОЖИДАНИЕ ДАННЫХ…</div>
          )}
        </div>
      )}
    </div>
  );
}
