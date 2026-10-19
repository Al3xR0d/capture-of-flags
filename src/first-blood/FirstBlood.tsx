import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FirstBloodContext, FirstBloodBatchContext, type FirstBloodEvent, type TriggerFirstBloodBatch } from './context';
// three.js и сцена грузятся лениво (отдельный чанк), оверлею нужен только таймлайн
import type { FrameInfo, Phase, Quality } from './scene';
import { T } from './timeline';
import { createSfx, type Sfx } from './sound';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import './firstBlood.css';

interface QueuedEvent extends Required<FirstBloodEvent> {
  key: string;
}

type OverlayPhase = 'intro' | 'impact' | 'shatter' | 'out';

const GLYPHS = 'ABCDEF0123456789#$%&@!?<>/\\[]{}=+*';
const MAX_ROWS = 6;

let seq = 0;
function normalize(ev: FirstBloodEvent): QueuedEvent {
  return { color: '#ff2e63', ...ev, key: `fb-${Date.now()}-${seq++}` };
}

function fakeFlag() {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 31; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `${s}=`;
}

function useScramble(text: string, active: boolean, rate = 0.55): string {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!active) return undefined;
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      const shown = Math.floor(tick * rate);
      setOut([...text].map((ch, i) => (i < shown || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''));
      if (shown >= text.length) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [text, active, rate]);
  return active ? out : '';
}

// после проявления — редкие «сбои» отдельных букв
function useFlicker(text: string, active: boolean): string {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!active) return undefined;
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      id = setTimeout(() => {
        const chars = [...text];
        const idx = chars.map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
        for (let n = 0; n < 1 + Math.floor(Math.random() * 2); n++) {
          chars[idx[Math.floor(Math.random() * idx.length)]] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setOut(chars.join(''));
        id = setTimeout(() => { setOut(text); loop(); }, 50 + Math.random() * 90);
      }, 450 + Math.random() * 1400);
    };
    loop();
    return () => clearTimeout(id);
  }, [text, active]);
  return out;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function TermLine({ text }: { text: string }) {
  const out = useScramble(text, true, 1.6);
  const kind = text.startsWith('[+]') ? 'ok' : text.startsWith('$') ? 'cmd' : 'info';
  return <div className={`fb-term-line fb-term-${kind}`}>{out}</div>;
}

function EventRow({ ev, index, active }: { ev: QueuedEvent; index: number; active: boolean }) {
  const team = useScramble(ev.team, active, 0.7);
  const service = useScramble(ev.service, active, 0.7);
  return (
    <li className="fb-event" style={{ '--team': ev.color, '--i': index } as CSSProperties}>
      <span className="fb-event-idx">#{String(index + 1).padStart(2, '0')}</span>
      <span className="fb-event-team">
        <i aria-hidden="true" />
        {team}
      </span>
      <span className="fb-event-arrow" aria-hidden="true">⟶</span>
      <span className="fb-event-svc">{service}</span>
    </li>
  );
}

interface OverlayProps {
  events: QueuedEvent[];
  holdMs: number;
  volume: number;
  quality: Quality;
  onClosing: () => void;
  onDone: () => void;
}

function Overlay({ events, holdMs, volume, quality, onClosing, onDone }: OverlayProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const closingRef = useRef(false);
  const shatteredRef = useRef(false);
  const [phase, setPhase] = useState<OverlayPhase>('intro');
  const [termCount, setTermCount] = useState(0);
  const main = events[0];

  const [termLines] = useState<[number, string][]>(() => {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return [
      [0.05, `$ ./sploit.py --svc ${slug(main.service)} --as ${slug(main.team)}`],
      [0.7, '[*] connecting to vulnbox ...'],
      [1.5, '[*] payload sent, dumping storage'],
      [T.impact, `[+] ${fakeFlag()}`],
      [T.impact + 0.6, '[*] submitting to checksystem ...'],
      [T.shatter, '[+] ACCEPTED :: FIRST BLOOD'],
    ];
  });

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase('out');
    onClosing();
    sfxRef.current?.stop(0.5);
    setTimeout(onDone, 560);
  }, [onClosing, onDone]);

  // Сцена и звук — один раз на показ
  useEffect(() => {
    const sfx = createSfx({ volume });
    sfxRef.current = sfx;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onPhase = (p: Phase) => {
      if (p === 'start') {
        timers.push(...termLines.map(([at], i) => setTimeout(() => {
          setTermCount(i + 1);
          if (i !== 3 && i !== 5) sfx.blip();
        }, at * 1000)));
      } else if (!closingRef.current) setPhase(p);
    };
    // HUD захвата цели двигается вслед за кубом напрямую через DOM, без ререндеров
    const onFrame = ({ t, rect, stage: sceneStage, progress, label }: FrameInfo) => {
      const el = lockRef.current;
      if (!el) return;
      const stage = sceneStage ?? (t < T.lock ? 'off' : t < T.drop ? 'scan' : t < T.impact ? 'locked' : t < T.shatter ? 'exploit' : 'done');
      if (label && targetRef.current && targetRef.current.textContent !== label) targetRef.current.textContent = label;
      if (el.dataset.stage !== stage) el.dataset.stage = stage;
      if (stage === 'done') return;
      // в крупном плане куб больше экрана — прицел становится рамкой видоискателя
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = Math.max(10, rect.w * 0.06);
      const m = 28;
      const x0 = Math.max(m, rect.x - pad);
      const y0 = Math.max(m, rect.y - pad);
      const x1 = Math.min(vw - m, rect.x + rect.w + pad);
      const y1 = Math.min(vh - m, rect.y + rect.h + pad);
      const inside = x1 - x0 > vw * 0.55 ? '1' : '0';
      if (el.dataset.inside !== inside) el.dataset.inside = inside;
      // справа не помещается плашка — ставим её слева от цели
      const side = x1 + 250 > vw && x0 > 250 ? 'left' : 'right';
      if (el.dataset.side !== side) el.dataset.side = side;
      el.style.transform = `translate(${x0}px, ${y0}px)`;
      el.style.width = `${Math.max(40, x1 - x0)}px`;
      el.style.height = `${Math.max(40, y1 - y0)}px`;
      // скобки «наводятся» рывками
      const lockP = Math.floor(clamp01((t - T.lock) / 0.8) * 4) / 4;
      el.style.setProperty('--k', String(1 + 0.55 * (1 - lockP)));
      const p = progress ?? clamp01((t - T.impact) / (T.shatter - T.impact));
      el.style.setProperty('--p', String(p));
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
    };
    let scene: { dispose(): void } | null = null;
    let cancelled = false;
    const fallback = (err: unknown) => {
      // WebGL недоступен — показываем HUD и звук по тому же таймлайну, без 3D
      console.warn('[first-blood] WebGL unavailable, HUD-only fallback', err);
      sfx.bed(T.shatter);
      onPhase('start');
      timers.push(
        setTimeout(() => { sfx.impact(); onPhase('impact'); }, T.impact * 1000),
        setTimeout(() => { sfx.shatter(); sfx.stinger(); onPhase('shatter'); }, T.shatter * 1000),
      );
    };
    import('./scene').then((m) => {
      if (cancelled) return;
      try {
        scene = m.createFirstBloodScene(stageRef.current!, {
          service: main.service,
          team: main.team,
          color: main.color,
          quality,
          sfx,
          onPhase,
          onFrame,
        });
      } catch (err) { fallback(err); }
    }, fallback);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      scene?.dispose();
      sfx.stop(0.15);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автозакрытие; каждое новое событие продлевает показ
  useEffect(() => {
    if (phase !== 'shatter') return undefined;
    const id = setTimeout(close, holdMs);
    return () => clearTimeout(id);
  }, [phase, events.length, holdMs, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const titleText = 'FIRST BLOOD';
  if (phase === 'shatter') shatteredRef.current = true;
  const revealed = shatteredRef.current;
  const scrambled = useScramble(titleText, revealed, 0.42);
  const flicker = useFlicker(titleText, scrambled === titleText);
  const title = scrambled === titleText ? flicker : scrambled;
  const hidden = Math.max(0, events.length - MAX_ROWS);
  const rows = events.slice(-MAX_ROWS);

  return (
    <div
      className={`fb-root fb-${phase}${revealed ? ' fb-revealed' : ''}`}
      onClick={close}
      role="alert"
      aria-live="assertive"
      aria-label={`First blood: ${events.map((e) => `${e.team} — ${e.service}`).join(', ')}`}
    >
      <div className="fb-dim" />
      <div ref={stageRef} className="fb-stage" aria-hidden="true" />
      <div className="fb-vignette" />
      <div className="fb-scanlines" />
      <div className="fb-flashbang" />
      <div className="fb-frame" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="fb-crt" aria-hidden="true" />
      <div className="fb-incoming" aria-hidden="true"><span>INCOMING TRANSMISSION</span></div>

      <div className="fb-lock" ref={lockRef} data-stage="off" aria-hidden="true">
        <div className="fb-lock-box"><i /><i /><i /><i /></div>
        <div className="fb-lock-tag">
          <div className="fb-lock-row"><b>TARGET</b><span ref={targetRef}>{main.service.toUpperCase()}</span></div>
          <div className="fb-lock-row fb-lock-vuln"><b>VULN</b><em /></div>
          <div className="fb-lock-row fb-lock-exp"><b>EXPLOIT</b><em /></div>
          <div className="fb-lock-bar"><i /><span ref={pctRef}>0%</span></div>
        </div>
      </div>

      <div className="fb-term" aria-hidden="true">
        {termLines.slice(0, termCount).map(([, text]) => <TermLine key={text} text={text} />)}
        <span className="fb-cursor" />
      </div>

      <div className="fb-hud">
        <h1 className="fb-title" data-text={title}>
          <span className="fb-title-text">{title || ' '}</span>
          <span className="fb-title-bar fb-title-bar-a" aria-hidden="true" />
          <span className="fb-title-bar fb-title-bar-b" aria-hidden="true" />
        </h1>
        <ul className="fb-events">
          {hidden > 0 && <li className="fb-event-more">+{hidden} earlier</li>}
          {rows.map((ev, i) => (
            <EventRow key={ev.key} ev={ev} index={hidden + i} active={revealed} />
          ))}
        </ul>
      </div>

      <div className="fb-skip">ESC / CLICK — SKIP</div>
    </div>
  );
}

export interface FirstBloodProviderProps {
  children?: ReactNode;
  /** Сколько держать титр после взрыва, мс; каждое новое событие продлевает показ */
  holdMs?: number;
  /** Громкость 0..1, 0 — без звука */
  volume?: number;
  /** auto снижает качество на телефонах и слабых CPU */
  quality?: Quality;
  /** Вызывается когда оверлей показывается */
  onShow?: () => void;
  /** Вызывается когда оверлей полностью скрыт */
  onClose?: () => void;
}

/**
 * Оборачивает приложение. Анимация вызывается через useFirstBlood()({ team, service, color }).
 * Если события приходят во время показа — они добавляются строками снизу.
 */
export function FirstBloodProvider({ children, holdMs = 7000, volume = 0.7, quality = 'auto', onShow, onClose }: FirstBloodProviderProps) {
  const [current, setCurrent] = useState<{ id: string; events: QueuedEvent[] } | null>(null);
  const activeRef = useRef(false);
  const closingRef = useRef(false);
  const queueRef = useRef<QueuedEvent[]>([]);
  const startShow = useCallback((events: QueuedEvent[]) => {
    activeRef.current = true;
    setCurrent({ id: events[0].key, events });
    onShow?.();
  }, [onShow]);

  const trigger = useCallback((ev: FirstBloodEvent) => {
    const item = normalize(ev);
    if (closingRef.current) {
      queueRef.current.push(item);
      return;
    }
    if (activeRef.current) {
      // Анимация уже идёт — добавляем в очередь для последующего показа
      queueRef.current.push(item);
      return;
    }
    // Каждая первая кровь — отдельная анимация
    startShow([item]);
  }, [startShow]);

  // Batch-триггер: запускает анимацию сразу со списком событий
  const batchTrigger = useCallback<TriggerFirstBloodBatch>((events) => {
    const items = events.map(normalize);
    if (!items.length) return;
    if (closingRef.current) {
      queueRef.current.push(...items);
      return;
    }
    if (activeRef.current) {
      queueRef.current.push(...items);
      return;
    }
    startShow(items);
  }, [startShow]);

  // прогрев в простое: подгрузить three.js, создать рендерер, скомпилировать шейдеры, посчитать осколки
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => { import('./scene').then((m) => m.preloadFirstBlood(quality)).catch(() => {}); };
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, [quality]);

  const handleClosing = useCallback(() => { closingRef.current = true; }, []);
  const handleDone = useCallback(() => {
    closingRef.current = false;
    activeRef.current = false;
    const queued = queueRef.current.shift();
    if (queued) {
      startShow([queued]);
    } else {
      setCurrent(null);
      onClose?.();
    }
  }, [startShow, onClose]);

  // Уход с борды: показ в скрытой вкладке никто не видит, а к возвращению он
  // «догонит» пользователя уже в другом раунде. Поэтому очередь чистим, а
  // текущий показ снимаем.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      queueRef.current = [];
      if (!activeRef.current) return;
      closingRef.current = false;
      activeRef.current = false;
      setCurrent(null);
      onClose?.();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [onClose]);

  return (
    <FirstBloodContext.Provider value={trigger}>
      <FirstBloodBatchContext.Provider value={batchTrigger}>
        {children}
        {current && createPortal(
          <Overlay
            key={current.id}
            events={current.events}
            holdMs={holdMs}
            volume={volume}
            quality={quality}
            onClosing={handleClosing}
            onDone={handleDone}
          />,
          document.body,
        )}
      </FirstBloodBatchContext.Provider>
    </FirstBloodContext.Provider>
  );
}

export { Overlay };
