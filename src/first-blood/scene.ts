// Оптимизированная 3D-сцена first blood.
// Отличия от v4: один рендерер и пост-обработка на все показы, прогрев в простое,
// осколки одной геометрией (позиции — в текстуре), глитч/ткань/пыль в шейдерах,
// облегчённые буферы, ограничение разрешения, адаптивное качество, 30 FPS в спокойной фазе.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { fractureCube, type Shard } from './fracture';
import { T } from './timeline';
import type { Sfx } from './sound';

export { T };
export type Phase = 'start' | 'impact' | 'shatter';
export type Quality = 'auto' | 'high' | 'low';
export type LockStage = 'off' | 'scan' | 'locked' | 'exploit' | 'done';

export interface FirstBloodSceneOptions {
  service: string;
  team: string;
  color: string;
  sfx: Sfx;
  quality?: Quality;
  onPhase?: (phase: Phase) => void;
  /** Каждый кадр: время таймлайна и экранный прямоугольник куба (px) — для DOM-HUD */
  onFrame?: (frame: FrameInfo) => void;
  /** Только собрать сцену и скомпилировать шейдеры (прогрев), без показа */
  warmup?: boolean;
}

export interface FrameInfo {
  t: number;
  rect: { x: number; y: number; w: number; h: number };
  stage?: LockStage;
  progress?: number;
  label?: string;
}

const CYAN = new THREE.Color('#00e5ff');
const GOLD = new THREE.Color('#ffc94d');
const RIG_Y = 0.35;
const FLOOR_Y = -1.4;
const IMPACT = new THREE.Vector3(0.12, 1, 0.08); // точка входа в локальных координатах куба
const POLE_LEN = 2.7;
const FLOOR_LOCAL = FLOOR_Y - RIG_Y;
const GRIND_DEPTH = 0.25;

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CUBE_CORNERS = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x, y, z))));

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function fitFont(g: CanvasRenderingContext2D, text: string, weight: number, maxW: number, start: number, min = 18) {
  let fs = start;
  do {
    g.font = `${weight} ${fs}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    fs -= 2;
  } while (g.measureText(text).width > maxW && fs > min);
  return fs + 2;
}

// Грань в духе хакерского UI из Watch Dogs: ч/б, пиксельный шум, глитч-срезы
export type ServiceStatus = 'online' | 'compromised' | 'pwned';

// детерминированный ГПСЧ: при смене статуса узор граней не меняется
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUS_STYLE: Record<ServiceStatus, { tag: string; tagColor: string; line: string; lineColor: string; plate: string; ink: string; frame: string }> = {
  online: { tag: '[ SECURED ]', tagColor: '#00e5ff', line: 'SERVICE  //  STATUS: ONLINE', lineColor: 'rgba(255,255,255,0.7)', plate: '#f4f7f9', ink: '#050607', frame: '#fff' },
  compromised: { tag: '[ BREACHED ]', tagColor: '#ff2e4d', line: 'STATUS: COMPROMISED', lineColor: '#ffb020', plate: '#f4f7f9', ink: '#050607', frame: '#ffb020' },
  pwned: { tag: '[ ROOT ACCESS ]', tagColor: '#ff2e4d', line: '!! STATUS: PWNED !!', lineColor: '#ff2e4d', plate: '#ff2e4d', ink: '#ffffff', frame: '#ff2e4d' },
};

function makeFaceTexture(service: string) {
  const S = 512;
  const base = document.createElement('canvas');
  base.width = base.height = S;
  const g = base.getContext('2d')!;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const seed = Math.floor(Math.random() * 1e9);
  const id = (seed & 0xffff).toString(16).toUpperCase().padStart(4, '0');

  const drawBase = (status: ServiceStatus) => {
    const st = STATUS_STYLE[status];
    const random = seeded(seed);
    const srnd = (a: number, b: number) => a + random() * (b - a);
    g.fillStyle = '#07090b';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 320; i++) {
      const sz = [4, 8, 8, 12, 16][Math.floor(random() * 5)];
      g.fillStyle = `rgba(255,255,255,${srnd(0.015, 0.07)})`;
      g.fillRect(Math.floor(random() * S / sz) * sz, Math.floor(random() * S / sz) * sz, sz, sz);
    }
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = 0; y < S; y += 6) if (random() < 0.22) g.fillRect(srnd(0, S / 2), y, srnd(40, S), 1);

    // рамка и уголки
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 2;
    g.strokeRect(20, 20, S - 40, S - 40);
    g.strokeStyle = st.frame;
    g.lineWidth = 6;
    for (const [x, y, dx, dy] of [[20, 20, 1, 1], [S - 20, 20, -1, 1], [20, S - 20, 1, -1], [S - 20, S - 20, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, y + dy * 44); g.lineTo(x, y); g.lineTo(x + dx * 44, y);
      g.stroke();
    }

    g.font = `700 19px ${mono}`;
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.textAlign = 'left';
    g.fillText(`> NODE_${id}`, 44, 64);
    g.textAlign = 'right';
    g.fillStyle = st.tagColor;
    g.fillText(st.tag, S - 44, 64);

    // название сервиса — белая плашка с чёрным текстом и цветной «поломкой» по краям
    const name = service.toUpperCase();
    const fs = fitFont(g, name, 900, 372, 86);
    g.font = `900 ${fs}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    const barH = Math.round(fs * 1.3);
    const barX = 40, barW = S - 80, barY = Math.round(S / 2 - barH / 2 - 10);
    g.fillStyle = '#00e5ff';
    g.fillRect(barX - 7, barY + 5, barW, barH);
    g.fillStyle = '#ff2bd6';
    g.fillRect(barX + 7, barY - 5, barW, barH);
    g.fillStyle = st.plate;
    g.fillRect(barX, barY, barW, barH);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = st.ink;
    g.fillText(name, S / 2, barY + barH / 2 + 3);

    g.font = `${status === 'online' ? 600 : 800} ${status === 'online' ? 17 : 20}px ${mono}`;
    g.fillStyle = st.lineColor;
    g.fillText(st.line, S / 2, barY + barH + 30);

    // пиксельная матрица и hex-дамп снизу
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 11; x++) {
        if (random() < 0.5) {
          g.fillStyle = random() < 0.12 ? '#00e5ff' : 'rgba(255,255,255,0.85)';
          g.fillRect(44 + x * 10, S - 124 + y * 10, 8, 8);
        }
      }
    }
    g.font = `500 14px ${mono}`;
    g.textAlign = 'right';
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let r = 0; r < 4; r++) {
      const hex = Array.from({ length: 6 }, () => Math.floor(random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(' ');
      g.fillText(hex, S - 44, S - 110 + r * 20);
    }

  };
  drawBase('online');
  let current: ServiceStatus = 'online';

  const view = document.createElement('canvas');
  view.width = view.height = S;
  const v = view.getContext('2d')!;
  v.drawImage(base, 0, 0);
  const tex = new THREE.CanvasTexture(view);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return {
    tex,
    setStatus(status: ServiceStatus) {
      if (status === current) return;
      current = status;
      drawBase(status);
      v.drawImage(base, 0, 0);
      tex.needsUpdate = true;
    },
    // перерисовка с горизонтальными срезами и инверсией блоков; amount 0..1
    glitch(amount: number) {
      v.globalCompositeOperation = 'source-over';
      v.drawImage(base, 0, 0);
      if (amount > 0) {
        const n = 1 + Math.floor(Math.random() * (2 + amount * 5));
        for (let i = 0; i < n; i++) {
          const y = Math.floor(Math.random() * S);
          const h = 4 + Math.floor(Math.random() * 36 * (0.4 + amount));
          const dx = (Math.random() - 0.5) * 70 * (0.3 + amount);
          v.drawImage(base, 0, y, S, h, dx, y, S, h);
        }
        if (Math.random() < 0.3 + amount * 0.5) {
          v.globalCompositeOperation = 'difference';
          v.fillStyle = '#fff';
          v.fillRect(Math.random() * S, Math.random() * S, rnd(20, 140), rnd(6, 40));
          v.globalCompositeOperation = 'source-over';
        }
      }
      tex.needsUpdate = true;
    },
  };
}

// Надписи голо-флага: белое на прозрачном, цвет даёт шейдер
function makeFlagTexture(team: string) {
  const W = 512, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;

  const draw = () => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#fff';
    // уголки рамки
    for (const [x, y, dx, dy] of [[18, 18, 1, 1], [W - 70, 18, -1, 1], [18, H - 18, 1, -1], [W - 70, H - 18, -1, -1]]) {
      g.fillRect(x, y - (dy < 0 ? 4 : 0), 34 * dx, 4);
      g.fillRect(x - (dx < 0 ? 4 : 0), y, 4, 34 * dy);
    }
    const name = team.toUpperCase();
    let fs = 92;
    do {
      g.font = `900 ${fs}px Orbitron, "Arial Black", sans-serif`;
      fs -= 2;
    } while (g.measureText(name).width > W - 150 && fs > 20);
    // плашка под текстом (альфа 0.4) — шейдер затемняет под ней сетку
    const tw = g.measureText(name).width;
    g.globalAlpha = 0.4;
    g.fillRect((W - 50) / 2 - tw / 2 - 22, H / 2 - 14 - fs * 0.75, tw + 44, fs * 1.5 + 44);
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, (W - 50) / 2, H / 2 - 14);
    g.font = '700 22px Orbitron, ui-monospace, monospace';
    g.globalAlpha = 0.75;
    g.fillText('// FLAG CAPTURED //', (W - 50) / 2, H / 2 + fs * 0.55 + 24);
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  };
  draw();
  // шрифт грузится асинхронно — перерисуем, когда будет готов
  document.fonts?.load('900 64px Orbitron').then(draw).catch(() => {});
  return tex;
}

// волна ткани считается в вершинном шейдере — без пересчёта геометрии на CPU
const HOLO_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float k = p.x / 1.36;
    p.z += sin(p.x * 5.2 - uTime * 7.5) * 0.09 * k + sin(p.y * 4.0 + uTime * 4.3) * 0.025 * k;
    p.y -= 0.05 * k * k;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// Голограмма: пиксельная сетка, бегущие строки развёртки, глитч-сдвиги, светящаяся кромка, «ласточкин хвост»
const HOLO_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x; // текст читается с обеих сторон
    float tick = floor(uTime * 14.0);
    float row = floor(uv.y * 22.0);
    float glitch = step(0.93, hash(row * 17.0 + tick * 3.1));
    uv.x += glitch * (hash(row + tick) - 0.5) * 0.08;

    // вырез «ласточкин хвост» со стороны свободного края
    float tail = 0.16 * (1.0 - abs(vUv.y - 0.5) * 2.0);
    float far = gl_FrontFacing ? vUv.x : vUv.x;
    if (far > 1.0 - tail) discard;

    vec2 cell = fract(uv * vec2(52.0, 32.0));
    float grid = step(0.14, cell.x) * step(0.14, cell.y);
    float scan = 0.7 + 0.3 * sin(uv.y * 140.0 - uTime * 9.0);
    float band = smoothstep(0.0, 0.05, 0.05 - abs(fract(uv.y - uTime * 0.35) - 0.5));
    float d = min(min(vUv.x, 1.0 - tail - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.035, d);
    float a = texture2D(uMap, uv).a;
    float text = smoothstep(0.55, 0.95, a);
    float plate = step(0.2, a);
    float flicker = 0.88 + 0.12 * hash(tick);

    vec3 holo = uColor * (0.28 + 0.22 * grid) * scan + uColor * band * 0.6;
    vec3 col = mix(holo, uColor * 0.06, plate * 0.85)
      + mix(uColor, vec3(1.0), 0.8) * text * 1.2
      + uColor * edge * 1.3;
    float alpha = (0.42 + 0.18 * grid + edge * 0.5 + plate * 0.35 + text * 0.5 + band * 0.25) * flicker * uOpacity;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,220,140,0.8)');
  r.addColorStop(0.6, 'rgba(255,170,40,0.2)');
  r.addColorStop(1, 'rgba(255,150,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSparks(max: number, { gravity = 6, drag = 1.2, size = 0.06, lifeRange = [0.5, 0.7] } = {}) {
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const tint: THREE.Color[] = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const [lifeMin, lifeVar] = lifeRange;
  let cursor = 0;

  return {
    points,
    emit(n: number, origin: THREE.Vector3, speed: number, colors: THREE.Color[]) {
      for (let i = 0; i < n; i++) {
        const k = cursor++ % max;
        const d = new THREE.Vector3().randomDirection();
        d.y = Math.abs(d.y) * 0.8 + 0.2;
        const s = speed * (0.3 + Math.random() * 0.9);
        pos.set([origin.x, origin.y, origin.z], k * 3);
        vel.set([d.x * s, d.y * s, d.z * s], k * 3);
        life[k] = lifeMin + Math.random() * lifeVar;
        tint[k] = colors[Math.floor(Math.random() * colors.length)];
      }
    },
    update(dt: number) {
      for (let k = 0; k < max; k++) {
        if (life[k] <= 0) { col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 0; continue; }
        life[k] -= dt;
        vel[k * 3 + 1] -= gravity * dt;
        for (let a = 0; a < 3; a++) {
          vel[k * 3 + a] *= 1 - drag * dt;
          pos[k * 3 + a] += vel[k * 3 + a] * dt;
        }
        const f = clamp01(life[k] / 0.6) * 1.3;
        const c = tint[k];
        col[k * 3] = c.r * f; col[k * 3 + 1] = c.g * f; col[k * 3 + 2] = c.b * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

const isLowEnd = (quality: Quality) => quality === 'low' || (quality === 'auto' && (
  window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4
));

const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 300);
};

// ---------- ядро, общее для всех показов ----------
interface Core {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  envTex: THREE.Texture;
  composer: EffectComposer;
  renderPass: RenderPass;
  bloom: UnrealBloomPass;
  rgb: ShaderPass;
  low: boolean;
}
let core: Core | null = null;

function getCore(quality: Quality): Core {
  if (core && !core.renderer.getContext().isContextLost()) return core;
  const low = isLowEnd(quality);
  const canvas = document.createElement('canvas');
  canvas.className = 'fb-canvas';
  // сглаживание окна не нужно: кадр идёт через пост-обработку со своим MSAA
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // лёгкий буфер: HalfFloat ради чистых тёмных градиентов, MSAA ×2 вместо ×4
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: low ? 0 : 2, depthBuffer: true });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.22, 0.65);
  composer.addPass(bloom);
  const rgb = new ShaderPass(RGBShiftShader);
  rgb.enabled = false;
  composer.addPass(rgb);
  composer.addPass(new OutputPass());
  core = { renderer, canvas, envTex, composer, renderPass, bloom, rgb, low };
  return core;
}

// ---------- осколки: расчёт заранее, в простое ----------
let fractureCache: { count: number; shards: Shard[] } | null = null;
function takeFracture(count: number): Shard[] {
  const cached = fractureCache && fractureCache.count === count ? fractureCache.shards : null;
  fractureCache = null;
  idle(() => { fractureCache = { count, shards: fractureCube({ size: 2, count, impact: IMPACT }) }; });
  return cached ?? fractureCube({ size: 2, count, impact: IMPACT });
}

// Все осколки — одна геометрия: у вершины номер осколка, позиция/поворот осколка — в текстуре.
// Вместо ~100 вызовов отрисовки (меш + линии на осколок) остаётся 3.
function mergeShards(shards: Shard[]) {
  const outerP: number[] = [], outerN: number[] = [], outerU: number[] = [], outerS: number[] = [];
  const innerP: number[] = [], innerN: number[] = [], innerU: number[] = [], innerS: number[] = [];
  const lineP: number[] = [], lineS: number[] = [];
  shards.forEach((sh, k) => {
    const g = sh.geometry;
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal.array;
    const uv = g.attributes.uv.array;
    for (const grp of g.groups) {
      const outer = grp.materialIndex === 0;
      for (let v = grp.start; v < grp.start + grp.count; v++) {
        (outer ? outerP : innerP).push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        (outer ? outerN : innerN).push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
        (outer ? outerU : innerU).push(uv[v * 2], uv[v * 2 + 1]);
        (outer ? outerS : innerS).push(k);
      }
    }
    const edges = new THREE.EdgesGeometry(g, 15);
    const ep = edges.attributes.position.array;
    for (let v = 0; v < ep.length / 3; v++) { lineP.push(ep[v * 3], ep[v * 3 + 1], ep[v * 3 + 2]); lineS.push(k); }
    edges.dispose();
    g.dispose();
  });
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute([...outerP, ...innerP], 3));
  mesh.setAttribute('normal', new THREE.Float32BufferAttribute([...outerN, ...innerN], 3));
  mesh.setAttribute('uv', new THREE.Float32BufferAttribute([...outerU, ...innerU], 2));
  mesh.setAttribute('aShard', new THREE.Float32BufferAttribute([...outerS, ...innerS], 1));
  mesh.addGroup(0, outerP.length / 3, 0);
  mesh.addGroup(outerP.length / 3, innerP.length / 3, 1);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(lineP, 3));
  lines.setAttribute('aShard', new THREE.Float32BufferAttribute(lineS, 1));
  return { mesh, lines };
}

const SHARD_VERT_HEAD = /* glsl */ `
  uniform highp sampler2D uShards;
  attribute float aShard;
  vec3 fbRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
`;
// строки текстуры: 0 — позиция + яркость рёбер, 1 — поворот (кватернион), 2 — цвет рёбер + видимость
const SHARD_FETCH = /* glsl */ `
  vec4 fbP = texelFetch(uShards, ivec2(int(aShard), 0), 0);
  vec4 fbQ = texelFetch(uShards, ivec2(int(aShard), 1), 0);
  vec4 fbC = texelFetch(uShards, ivec2(int(aShard), 2), 0);
`;

interface ShardUniforms {
  uShards: { value: THREE.DataTexture };
  uDissolve: { value: number };
  uGlitch: { value: number };
  uGlitchSeed: { value: number };
}

// материал граней/внутренностей: трансформ осколка + пиксельное растворение (+ глитч граней в шейдере)
function patchShardMesh(mat: THREE.Material, u: ShardUniforms, withGlitch: boolean) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = SHARD_VERT_HEAD + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        ${SHARD_FETCH}
        objectNormal = fbRot(fbQ, objectNormal);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = fbRot(fbQ, transformed) * fbC.a + fbP.xyz;`);
    let frag = 'uniform float uDissolve;\nuniform float uGlitch;\nuniform float uGlitchSeed;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        vec2 fbCell = floor(gl_FragCoord.xy / 6.0);
        float fbN = fract(sin(dot(fbCell, vec2(12.9898, 78.233))) * 43758.5453);
        if (fbN < uDissolve) discard;
        float fbEdge = uDissolve > 0.001 ? 1.0 - smoothstep(0.0, 0.09, fbN - uDissolve) : 0.0;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.55, 0.95, 1.0) * fbEdge * 2.5;`);
    if (withGlitch) {
      // горизонтальные срезы граней: сдвиг UV по случайным строкам — без перерисовки текстуры
      frag = frag
        .replace('#include <map_fragment>', `
          vec2 fbUv = vMapUv;
          float fbRow = floor(fbUv.y * 26.0);
          float fbH = fract(sin(fbRow * 91.7 + uGlitchSeed) * 43758.5453);
          if (fbH < uGlitch * 0.4) fbUv.x += (fract(fbH * 37.3) - 0.5) * 0.14 * (0.3 + uGlitch);
          ${THREE.ShaderChunk.map_fragment.replace(/vMapUv/g, 'fbUv')}
          float fbB = fract(sin(dot(floor(fbUv * vec2(6.0, 18.0)), vec2(12.9, 78.2)) + uGlitchSeed) * 43758.5453);
          if (fbB < uGlitch * 0.05) diffuseColor.rgb = 1.0 - diffuseColor.rgb;`)
        .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment.replace(/vEmissiveMapUv/g, 'fbUv'));
    }
    sh.fragmentShader = frag;
  };
}

function patchShardLines(mat: THREE.Material, u: ShardUniforms) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = SHARD_VERT_HEAD + 'varying vec4 vFbLine;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${SHARD_FETCH}
        transformed = fbRot(fbQ, transformed) * fbC.a + fbP.xyz;
        vFbLine = vec4(fbC.rgb, fbP.w);`);
    sh.fragmentShader = 'varying vec4 vFbLine;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = vFbLine.rgb;
        diffuseColor.a *= vFbLine.a;`);
  };
}

/**
 * Прогрев в простое: создать рендерер, посчитать осколки и скомпилировать шейдеры заранее.
 * После этого первый показ стартует без подвисаний.
 */
export function preloadFirstBlood(quality: Quality = 'auto') {
  const c = getCore(quality);
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:360px;pointer-events:none;';
  document.body.appendChild(holder);
  const noop = () => {};
  const silent = new Proxy({}, { get: () => noop }) as Sfx;
  const scene = createFirstBloodScene(holder, { service: 'warmup', team: 'warmup', color: '#ffffff', sfx: silent, quality, warmup: true });
  setTimeout(() => { scene.dispose(); holder.remove(); }, 0);
  return c;
}

/** Создаёт сцену first blood в контейнере (canvas общий для всех показов). Сцена сама ведёт таймлайн. */
export function createFirstBloodScene(
  container: HTMLElement,
  { service, team, color, sfx, quality = 'auto', onPhase = () => {}, onFrame, warmup = false }: FirstBloodSceneOptions,
): { dispose(): void } {
  const c = getCore(quality);
  const { renderer, canvas, composer, renderPass, bloom, rgb } = c;
  const low = c.low;
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 8, 20);
  scene.environment = c.envTex;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camBase = new THREE.Vector3(5.0, 3.0, 7.6);
  const camTarget = new THREE.Vector3(0, 0.95, 0);
  let camFit = 1;
  renderPass.scene = scene;
  renderPass.camera = camera;

  // Свет: холодный неон + тёплый ключ
  scene.add(new THREE.AmbientLight(0x223344, 0.6));
  const cyanLight = new THREE.PointLight(0x00e5ff, 30, 14);
  cyanLight.position.set(-3.5, 2, 2.5);
  const magLight = new THREE.PointLight(0xff2bd6, 18, 14);
  magLight.position.set(3.5, -0.5, 2);
  const key = new THREE.DirectionalLight(0xfff1d6, 1.4);
  key.position.set(2, 6, 4);
  const flash = new THREE.PointLight(0xffc94d, 0, 12);
  scene.add(cyanLight, magLight, key, flash);

  // Пол-сетка и «захват территории»
  const grid = new THREE.GridHelper(36, 36, 0x00e5ff, 0x00e5ff);
  grid.position.y = FLOOR_Y;
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.transparent = true;
  gridMat.opacity = 0.16;
  gridMat.depthWrite = false;
  const territory = {
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 0 },
    uStrength: { value: 0 },
    uColor: { value: new THREE.Color(color) },
  };
  gridMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, territory);
    sh.vertexShader = 'varying vec3 vFbWorld;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vFbWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vFbWorld;\nuniform vec2 uCenter;\nuniform float uRadius;\nuniform float uStrength;\nuniform vec3 uColor;\n'
      + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float fbD = distance(vFbWorld.xz, uCenter);
        float fbIn = (1.0 - smoothstep(uRadius - 0.4, uRadius, fbD)) * (1.0 - smoothstep(1.5, 10.0, fbD));
        float fbRing = smoothstep(uRadius - 0.6, uRadius, fbD) * (1.0 - smoothstep(uRadius, uRadius + 0.1, fbD));
        diffuseColor.rgb = mix(diffuseColor.rgb, uColor, fbIn * uStrength) + uColor * fbRing * 1.6 * uStrength;
        diffuseColor.a = min(1.0, diffuseColor.a * (1.0 + (fbIn * 2.2 + fbRing * 4.0) * uStrength));`);
  };
  scene.add(grid);

  // Пыль: дрейф вверх считается в вершинном шейдере
  const dustN = low ? 200 : 420;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) dustPos.set([(Math.random() - 0.5) * 16, -1.4 + Math.random() * 7, -6 + Math.random() * 10], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTime = { value: 0 };
  const dustMat = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.025, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  dustMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = dustTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  transformed.y = mod(transformed.y + 1.4 + uTime * 0.18, 7.0) - 1.4;');
  };
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---------- куб-сервис из осколков ----------
  const rig = new THREE.Group();
  rig.position.y = RIG_Y;
  scene.add(rig);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -10);
  const face = makeFaceTexture(service);
  const raw = takeFracture(low ? 34 : 52);
  const shards = raw.map((sh) => ({
    center: sh.center.clone(), radius: sh.radius,
    pos: sh.center.clone(), quat: new THREE.Quaternion(), ang: new THREE.Vector3(), vel: new THREE.Vector3(),
    dist: sh.center.distanceTo(IMPACT),
    axisDist: Math.hypot(sh.center.x - IMPACT.x, sh.center.z - IMPACT.z),
    lineAlpha: 0, lineColor: GOLD.clone(), lineTarget: new THREE.Color(), visible: 1,
  }));
  const maxAxis = Math.max(...shards.map((s) => s.axisDist));
  const merged = mergeShards(raw);
  const shardData = new Float32Array(shards.length * 3 * 4);
  const shardTex = new THREE.DataTexture(shardData, shards.length, 3, THREE.RGBAFormat, THREE.FloatType);
  shardTex.minFilter = shardTex.magFilter = THREE.NearestFilter;
  const su: ShardUniforms = { uShards: { value: shardTex }, uDissolve: { value: 0 }, uGlitch: { value: 0 }, uGlitchSeed: { value: 0 } };
  const syncShards = () => {
    shards.forEach((s, k) => {
      shardData.set([s.pos.x, s.pos.y, s.pos.z, s.lineAlpha], k * 4);
      shardData.set([s.quat.x, s.quat.y, s.quat.z, s.quat.w], (shards.length + k) * 4);
      shardData.set([s.lineColor.r, s.lineColor.g, s.lineColor.b, s.visible], (shards.length * 2 + k) * 4);
    });
    shardTex.needsUpdate = true;
  };
  syncShards();

  const outerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: face.tex, emissive: 0xffffff, emissiveMap: face.tex, emissiveIntensity: 0.2,
    metalness: 0.65, roughness: 0.3,
    transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    clippingPlanes: [clipPlane],
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x0d0a06, emissive: 0xffa21a, emissiveIntensity: 0, metalness: 0.85, roughness: 0.55,
    transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    clippingPlanes: [clipPlane],
  });
  patchShardMesh(outerMat, su, true);
  patchShardMesh(innerMat, su, false);
  const shardMesh = new THREE.Mesh(merged.mesh, [outerMat, innerMat]);
  shardMesh.frustumCulled = false;
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [clipPlane] });
  patchShardLines(lineMat, su);
  const shardLines = new THREE.LineSegments(merged.lines, lineMat);
  shardLines.frustumCulled = false;
  rig.add(shardMesh, shardLines);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.01, 2.01, 2.01)),
    new THREE.LineBasicMaterial({ color: new THREE.Color('#e4fbff').multiplyScalar(1.2), transparent: true, clippingPlanes: [clipPlane] }),
  );
  rig.add(outline);
  const scan = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.12, 2.12)), new THREE.LineBasicMaterial({
    color: CYAN.clone().multiplyScalar(1.5), transparent: true, opacity: 0,
  }));
  scan.rotation.x = -Math.PI / 2;
  rig.add(scan);

  // ---------- флаг ----------
  const teamColor = new THREE.Color(color);
  const flag = new THREE.Group();
  flag.visible = false;
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 1, roughness: 0.32 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, POLE_LEN - 0.24, 10), poleMat);
  pole.position.y = 0.24 + (POLE_LEN - 0.24) / 2;
  const spearMat = new THREE.MeshStandardMaterial({ color: 0x3a4049, metalness: 1, roughness: 0.2, emissive: 0xff7a1a, emissiveIntensity: 0, flatShading: true });
  const spear = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.32, 4), spearMat);
  spear.rotation.set(Math.PI, Math.PI / 4, 0);
  spear.position.y = 0.16;
  const ledMat = new THREE.MeshBasicMaterial({ color: teamColor.clone().multiplyScalar(2.2) });
  const ledGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.035, 12);
  const leds = [0.42, 0.95, 1.5].map((y) => {
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.y = y;
    return led;
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.08, 4), poleMat);
  collar.position.y = 0.3;
  collar.rotation.y = Math.PI / 4;
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), new THREE.MeshBasicMaterial({ color: teamColor.clone().multiplyScalar(2.5) }));
  tip.position.y = POLE_LEN + 0.06;
  const flagTex = makeFlagTexture(team);
  const clothGeo = new THREE.PlaneGeometry(1.32, 0.8, 28, 14);
  clothGeo.translate(0.66 + 0.04, 0, 0);
  const holo = {
    uMap: { value: flagTex },
    uColor: { value: teamColor.clone().lerp(new THREE.Color('#ffffff'), 0.12) },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  };
  const cloth = new THREE.Mesh(clothGeo, new THREE.ShaderMaterial({
    uniforms: holo, vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  }));
  cloth.position.y = POLE_LEN - 0.43;
  cloth.frustumCulled = false;
  const flagLight = new THREE.PointLight(teamColor, 0, 3);
  flagLight.position.set(0.4, POLE_LEN - 0.8, 0.9);
  flag.add(pole, spear, collar, ...leds, tip, cloth, flagLight);
  flag.position.copy(IMPACT);
  flag.rotation.y = 0.35;
  rig.add(flag);

  // лазер-целеуказатель
  const laserMat = new THREE.MeshBasicMaterial({
    color: teamColor.clone().lerp(new THREE.Color('#ffffff'), 0.25), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 9, 6, 1, true), laserMat);
  laser.position.set(IMPACT.x, IMPACT.y + 4.5, IMPACT.z);
  const dotMat = laserMat.clone();
  const laserDot = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.1, 32), dotMat);
  laserDot.rotation.x = -Math.PI / 2;
  laserDot.position.set(IMPACT.x, IMPACT.y + 0.012, IMPACT.z);
  laser.visible = laserDot.visible = false;
  rig.add(laser, laserDot);

  // ---------- эффекты ----------
  const ringGeo = new THREE.RingGeometry(0.92, 1, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(1.1), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(IMPACT).add(new THREE.Vector3(0, 0.01, 0));
  rig.add(ring);
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.material.color = CYAN.clone();
  ring2.position.set(0, RIG_Y, 0);
  scene.add(ring2);
  const ring3 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring3.rotation.x = -Math.PI / 2;
  scene.add(ring3);
  const glowTex = makeGlowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, RIG_Y, 0);
  scene.add(glow);
  const sparks = createSparks(low ? 400 : 700);
  scene.add(sparks.points);
  const pixels = createSparks(low ? 160 : 300, { gravity: -0.9, drag: 1.8, size: 0.075, lifeRange: [0.7, 0.9] });
  scene.add(pixels.points);
  const pixelColors = [CYAN, new THREE.Color('#ffffff'), new THREE.Color('#9ff3ff')];

  // ---------- размер и качество ----------
  // уровень 0 — полное качество; дальше при просадке: ниже разрешение, без bloom, ещё ниже разрешение
  let qualityLevel = 0;
  const prCap = () => [low ? 1 : 1.5, 1, 1, 0.75][qualityLevel];
  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    // внутреннее разрешение не больше ~2048 px по ширине: на 4K-проекторе это главная экономия
    const pr = Math.min(window.devicePixelRatio, prCap(), 2048 / w);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    const halfH = Math.tan(THREE.MathUtils.degToRad(16));
    camera.fov = camera.aspect < 1.3 ? Math.min(75, THREE.MathUtils.radToDeg(2 * Math.atan((halfH * 1.3) / camera.aspect))) : 32;
    camFit = camera.fov >= 75 ? 1.15 : 1;
    camera.updateProjectionMatrix();
  }
  resize();
  bloom.enabled = true;
  window.addEventListener('resize', resize);

  const disposeAll = () => {
    window.removeEventListener('resize', resize);
    scene.traverse((obj) => {
      const o = obj as THREE.Mesh;
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) m.dispose();
    });
    for (const tx of [face.tex, flagTex, glowTex, shardTex]) tx.dispose();
    renderPass.scene = new THREE.Scene();
    if (canvas.parentElement === container) container.removeChild(canvas);
  };

  // прогрев: компилируем все программы шейдеров и выходим — они останутся в кэше рендерера
  flag.visible = true;
  laser.visible = laserDot.visible = true;
  glow.material.opacity = ringMat.opacity = ring2.material.opacity = 0.001;
  if (warmup) {
    renderer.compile(scene, camera);
    return { dispose: disposeAll };
  }

  // ---------- цикл ----------
  const fired = new Set<string>();
  const once = (name: string, fn: () => void) => { if (!fired.has(name)) { fired.add(name); fn(); } };
  let shake = 0;
  let flagVel = 0;
  let plantedAt = -1;
  const entryWorld = new THREE.Vector3();
  let glitch = 0;
  let faceGlitchTimer = 0;
  let raf = 0;
  let last = 0;
  let start: number | null = null;
  let frameNo = 0;
  let avgDt = 1 / 60;
  let lastDowngrade = 0;
  const tmp = new THREE.Vector3();
  const sparkColors = [GOLD, new THREE.Color('#fff3c4'), teamColor];
  const shardColors = [GOLD, CYAN, new THREE.Color('#ffffff')];

  function rigAngle(t: number) {
    if (t < T.impact) return 0.55 * (t - T.impact);
    return 0.33 * (1 - Math.exp(-(t - T.impact) / 0.6));
  }

  function frame(nowMs: number) {
    raf = requestAnimationFrame(frame);
    if (start === null) { start = last = nowMs; sfx.bed(T.shatter); onPhase('start'); }
    const rawDt = (nowMs - last) / 1000;
    const dt = Math.min(1 / 30, rawDt);
    last = nowMs;
    const t = (nowMs - start) / 1000;
    frameNo++;

    // адаптивное качество: средний интервал кадра > 22 мс — ступенька вниз (не чаще раза в 1.5 с)
    if (!document.hidden && rawDt < 0.25) avgDt += (rawDt - avgDt) * 0.05;
    if (frameNo > 40 && avgDt > 0.022 && qualityLevel < 3 && t - lastDowngrade > 1.5) {
      qualityLevel++;
      lastDowngrade = t;
      if (qualityLevel >= 2) bloom.enabled = false;
      resize();
      avgDt = 1 / 60;
    }

    rig.rotation.y = rigAngle(t);

    // сборка куба снизу вверх
    const b = easeInOut(clamp01((t - T.buildStart) / (T.buildEnd - T.buildStart)));
    const clipY = RIG_Y - 1.06 + 2.14 * b;
    clipPlane.constant = t > T.buildEnd + 0.05 ? 100 : clipY;
    scan.position.y = clipY - RIG_Y;
    scan.material.opacity = t > T.buildStart && t < T.buildEnd + 0.08 ? 1 : 0;

    // лазер
    laser.visible = laserDot.visible = t >= T.laser && t < T.impact;
    if (laser.visible) {
      once('laser', () => sfx.lock());
      const lt = t - T.laser;
      const on = lt < 0.35 ? (Math.random() < 0.5 ? 1 : 0.1) : 0.85 + 0.15 * Math.sin(t * 40);
      laserMat.opacity = on;
      dotMat.opacity = on;
      laserDot.scale.setScalar(1 + 0.35 * Math.sin(lt * 9) * Math.exp(-lt * 0.8) + 2.5 * Math.exp(-lt * 7));
    }

    // падение флага
    flag.visible = t >= T.drop;
    if (t >= T.drop && t < T.impact) {
      once('drop', () => sfx.whoosh(T.impact - T.drop));
      const p = clamp01((t - T.drop) / (T.impact - T.drop));
      flag.position.y = IMPACT.y + 6 * (1 - p * p);
      flagLight.intensity = 0.6 + 0.8 * p;
    }

    if (t >= T.impact) {
      once('impact', () => {
        face.setStatus('compromised');
        shake = 0.22;
        glitch = 0.004;
        flash.position.copy(rig.localToWorld(IMPACT.clone()));
        flash.intensity = 10;
        ringMat.opacity = 1;
        sparks.emit(90, flash.position, 4.2, sparkColors);
        sfx.impact();
        sfx.crack(T.shatter - T.impact);
        sfx.riser(T.shatter - T.impact);
        onPhase('impact');
      });
      const rp = clamp01((t - T.impact) / 0.6);
      ring.scale.setScalar(0.05 + easeOut(rp) * 2.6);
      ringMat.opacity = 1 - rp;
    }

    // продавливание насквозь
    if (t >= T.impact && t < T.shatter) {
      const ti = t - T.impact;
      let tipY;
      if (t < T.grind) {
        tipY = IMPACT.y - GRIND_DEPTH * easeOut(clamp01(ti / 0.08));
        flag.rotation.z = 0.12 * Math.exp(-ti * 6) * Math.sin(ti * 38);
        flag.rotation.x = 0.07 * Math.exp(-ti * 6) * Math.sin(ti * 31 + 1);
      } else {
        once('grind', () => sfx.grind(T.shatter - T.grind));
        const q = (t - T.grind) / (T.shatter - T.grind);
        if (q > 0.5) once('pwned', () => { face.setStatus('pwned'); glitch = Math.max(glitch, 0.003); });
        tipY = IMPACT.y - GRIND_DEPTH - (2 - GRIND_DEPTH) * q * q;
        flag.rotation.z = (Math.random() - 0.5) * 0.02;
        flag.rotation.x = (Math.random() - 0.5) * 0.02;
      }
      flag.position.y = tipY;
      const heat = smooth(T.impact, T.shatter, t);
      spearMat.emissiveIntensity = heat * 1.5;
      const reach = 0.22 + (maxAxis + 0.35) * Math.pow(heat, 1.6);
      for (const s of shards) {
        const yc = Math.min(IMPACT.y, Math.max(tipY, s.center.y));
        const d = Math.hypot(s.axisDist, s.center.y - yc);
        s.lineAlpha = smooth(0, 0.3, reach - d) * (0.8 + Math.random() * 0.4);
        const pushed = s.center.y > tipY ? smooth(0.5, 0, s.axisDist) * 0.07 : 0;
        tmp.set(s.center.x - IMPACT.x, 0, s.center.z - IMPACT.z).normalize().multiplyScalar(heat * heat * 0.04 + pushed);
        s.pos.copy(s.center).add(tmp);
      }
      if (t >= T.grind) {
        entryWorld.copy(IMPACT);
        rig.localToWorld(entryWorld);
        sparks.emit(3, entryWorld, 3.2, sparkColors);
      }
      innerMat.emissiveIntensity = heat * 0.9;
      outerMat.emissiveIntensity = 0.2 + (Math.random() < heat * 0.25 ? 0.4 : 0);
      outline.material.opacity = Math.random() < heat * 0.35 ? 0.2 : 1;
      const j = heat * 0.03;
      rig.position.set((Math.random() - 0.5) * j, RIG_Y + (Math.random() - 0.5) * j, (Math.random() - 0.5) * j);
    }

    // взрыв
    if (t >= T.shatter) {
      once('shatter', () => {
        rig.position.set(0, RIG_Y, 0);
        outline.visible = false;
        shake = 0.35;
        glitch = 0.006;
        flash.position.set(0, RIG_Y, 0);
        flash.intensity = 12;
        glow.material.opacity = 1;
        ring2.material.opacity = 1;
        sparks.emit(260, flash.position, 7, sparkColors);
        sparks.emit(80, rig.localToWorld(new THREE.Vector3(IMPACT.x, -1, IMPACT.z)), 5, sparkColors);
        flag.position.y = -1;
        flagVel = 2 * (2 - GRIND_DEPTH) / (T.shatter - T.grind);
        for (const s of shards) {
          const rad = tmp.set(s.center.x - IMPACT.x, 0, s.center.z - IMPACT.z);
          if (rad.lengthSq() < 1e-4) rad.set(Math.random() - 0.5, 0, Math.random() - 0.5);
          rad.normalize();
          const near = 1 - clamp01(s.axisDist / 1.4);
          s.vel.copy(rad).multiplyScalar(2.2 + Math.random() * 2.5 + near * 4.5);
          s.vel.y = s.center.y * 1.3 + 1.3 + Math.random() * 1.5;
          s.vel.addScaledVector(new THREE.Vector3().randomDirection(), 0.6);
          s.ang.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(10 + Math.random() * 8);
          s.lineTarget.copy(shardColors[Math.floor(Math.random() * shardColors.length)]).multiplyScalar(0.55);
          s.lineColor.copy(GOLD).multiplyScalar(1.3);
        }
        sfx.shatter();
        sfx.stinger();
        onPhase('shatter');
      });

      const ts = t - T.shatter;
      const sdt = dt * (ts < 0.22 ? 0.12 : 0.12 + 0.88 * smooth(0.22, 0.95, ts));
      const dq = new THREE.Quaternion();
      const dp = smooth(T.fadeShards, T.fadeShards + T.dissolve, t);
      const lineFade = 1 - smooth(T.fadeShards, T.fadeShards + T.dissolve * 0.5, t);
      const cool = clamp01(ts / 0.9);
      for (const s of shards) {
        if (!s.visible) continue;
        s.vel.y -= 7.5 * sdt;
        s.pos.addScaledVector(s.vel, sdt);
        tmp.copy(s.ang).multiplyScalar(sdt);
        const angle = tmp.length();
        if (angle > 1e-6) s.quat.premultiply(dq.setFromAxisAngle(tmp.normalize(), angle));
        const r = s.radius * 0.55;
        if (s.pos.y - r < FLOOR_LOCAL) {
          s.pos.y = FLOOR_LOCAL + r;
          s.vel.y = Math.abs(s.vel.y) * 0.32;
          s.vel.x *= 0.7; s.vel.z *= 0.7;
          s.ang.multiplyScalar(0.6);
        }
        s.lineColor.lerp(s.lineTarget, cool * 0.08);
        s.lineAlpha = lineFade * (0.35 + 0.2 * Math.sin(ts * 9 + s.dist * 7)) * (0.4 + 0.6 * Math.exp(-ts * 2));
        if (dp > 0 && dp < 0.95 && Math.random() < 0.16) {
          tmp.copy(s.pos);
          rig.localToWorld(tmp);
          pixels.emit(1, tmp, 0.7, pixelColors);
        }
        if (dp >= 1) s.visible = 0;
      }
      su.uDissolve.value = dp * 1.02;
      innerMat.emissiveIntensity = 0.03 + 0.4 * Math.exp(-ts * 7);
      outerMat.emissiveIntensity = 0.18;

      // флаг втыкается в пол
      if (plantedAt < 0) {
        flagVel += 9.8 * sdt;
        flag.position.y -= flagVel * sdt;
        if (flag.position.y <= FLOOR_LOCAL) {
          plantedAt = t;
          flag.position.y = FLOOR_LOCAL - 0.2;
          spear.visible = false;
          const floorPt = rig.localToWorld(new THREE.Vector3(IMPACT.x, FLOOR_LOCAL + 0.01, IMPACT.z));
          ring3.position.copy(floorPt);
          ring3.material.opacity = 1;
          flash.position.copy(floorPt);
          flash.intensity = 7;
          sparks.emit(120, floorPt, 4, sparkColors);
          shake = Math.max(shake, 0.2);
          territory.uCenter.value.set(floorPt.x, floorPt.z);
          territory.uStrength.value = 1;
          sfx.thud();
        }
      } else {
        const tp = t - plantedAt;
        flag.rotation.z = 0.1 * Math.exp(-tp * 3.5) * Math.sin(tp * 22);
        flag.rotation.x = 0.06 * Math.exp(-tp * 3.5) * Math.sin(tp * 19 + 1);
        const r3 = clamp01(tp / 0.8);
        ring3.scale.setScalar(0.05 + easeOut(r3) * 4);
        ring3.material.opacity = 1 - r3;
        territory.uRadius.value = 0.2 + easeOut(clamp01(tp / 3.6)) * 11;
      }
      spearMat.emissiveIntensity = 1.5 * Math.exp(-ts * 1.2);
      flagLight.intensity = 1.2 + 1.5 * Math.exp(-ts * 2);

      const gp = clamp01(ts / 0.5);
      glow.visible = gp < 1;
      glow.scale.setScalar(0.5 + easeOut(gp) * 5);
      glow.material.opacity = 0.18 * (1 - gp) * (1 - gp);
      const r2 = clamp01(ts / 0.9);
      ring2.visible = r2 < 1;
      ring2.scale.setScalar(0.1 + easeOut(r2) * 7);
      ring2.material.opacity = 1 - r2;
      ring2.lookAt(camera.position);
    }
    // до удара осколки неподвижны — текстуру положений не обновляем
    if (t >= T.impact) {
      shardMesh.visible = shardLines.visible = shards.some((s) => s.visible);
      syncShards();
    }

    // глитч граней — только uniform, без перерисовки текстуры
    if (t < T.fadeShards + 1.5) {
      faceGlitchTimer -= dt;
      if (faceGlitchTimer <= 0) {
        const stress = t >= T.impact ? 0.5 + 0.5 * smooth(T.impact, T.shatter, t) : 0;
        const on = Math.random() < 0.35 + stress * 0.6;
        su.uGlitch.value = on ? Math.max(stress, Math.random() * 0.3) : 0;
        su.uGlitchSeed.value = Math.random() * 100;
        faceGlitchTimer = on ? 0.05 + Math.random() * 0.1 : 0.15 + Math.random() * (0.6 - stress * 0.5);
      }
    } else su.uGlitch.value = 0;

    holo.uTime.value = t;
    tip.rotation.y = t * 2.2;
    dustTime.value = t;
    sparks.update(dt);
    pixels.update(dt);
    flash.intensity *= Math.exp(-dt * 7);

    // камера: общий план с мягким наездом на пробитие и отъездом на взрыве
    const zoomIn = easeInOut(clamp01((t - T.zoomIn) / (T.impact + 0.35 - T.zoomIn)));
    const zoomOut = easeInOut(clamp01((t - T.shatter + 0.1) / 1.1));
    const zc = zoomIn * (1 - zoomOut);
    const push = 1.12 - 0.12 * easeOut(clamp01(t / 2.4)) + 0.06 * smooth(T.shatter, T.shatter + 2.5, t);
    const tp = plantedAt > 0 ? t - plantedAt : 0;
    const orbit = 0.28 * Math.sin(tp * 0.45) * (1 - Math.exp(-tp * 1.5));
    camera.position.copy(camBase).applyAxisAngle(Y_AXIS, orbit).multiplyScalar(push * camFit);
    camera.position.x += Math.sin(t * 0.4) * 0.15;
    camTarget.set(0, 0, 0);
    if (t < T.impact) camTarget.y = 0.95 + 0.5 * smooth(T.drop, T.impact, t);
    else camTarget.y = 1.45 - 1.15 * smooth(T.impact + 0.1, T.shatter + 0.7, t);
    if (zc > 0.001) {
      const k = smooth(T.impact, T.shatter, t);
      tmp.set(2.45 + 0.35 * k, 1.85 - 0.55 * k, 2.95 + 0.35 * k).applyAxisAngle(Y_AXIS, rig.rotation.y);
      tmp.y += RIG_Y;
      camera.position.lerp(tmp, zc);
      tmp.set(IMPACT.x, 0, IMPACT.z).applyAxisAngle(Y_AXIS, rig.rotation.y);
      tmp.y = RIG_Y + 1.2 - 0.8 * k;
      camTarget.lerp(tmp, zc);
    }
    if (shake > 0.001) {
      camera.position.add(tmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(shake * (1 - 0.5 * zc)));
      shake *= Math.exp(-dt * 9);
    }
    camera.lookAt(camTarget);

    // RGB-сдвиг — отдельный полноэкранный проход, включаем только во время глитча
    rgb.enabled = glitch > 0.0004;
    rgb.uniforms.amount.value = glitch;
    rgb.uniforms.angle.value = Math.random() * Math.PI * 2;
    glitch *= Math.exp(-dt * 6);

    if (onFrame) {
      camera.updateMatrixWorld();
      rig.updateMatrixWorld();
      const w = container.clientWidth;
      const h = container.clientHeight;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const cc of CUBE_CORNERS) {
        tmp.copy(cc).applyMatrix4(rig.matrixWorld).project(camera);
        const px = (tmp.x + 1) / 2 * w;
        const py = (1 - tmp.y) / 2 * h;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      onFrame({ t, rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
    }

    // спокойная фаза (осколки растворились, остался флаг) — рисуем через кадр, ~30 FPS
    const calm = t > T.fadeShards + T.dissolve + 0.6;
    if (!calm || frameNo % 2 === 0) composer.render(dt);
  }

  // старт после асинхронной компиляции шейдеров: главный поток не блокируется
  let cancelled = false;
  const begin = () => {
    if (cancelled) return;
    flag.visible = false;
    laser.visible = laserDot.visible = false;
    raf = requestAnimationFrame(frame);
  };
  const compiled = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
  Promise.race([compiled, new Promise((r) => setTimeout(r, 1500))]).then(begin, begin);

  return {
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      disposeAll();
    },
  };
}
