import * as THREE from 'three';

// Voronoi-разбиение куба [-h, h]^3 на выпуклые осколки.
// Каждая ячейка = куб, обрезанный бисекторными плоскостями к соседним сидам.

const EPS = 1e-6;

interface Face {
  normal: THREE.Vector3;
  verts: THREE.Vector3[];
  outer: boolean;
}

export interface Shard {
  geometry: THREE.BufferGeometry;
  center: THREE.Vector3;
  radius: number;
}

function cubePoly(h: number): Face[] {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * h, y * h, z * h);
  const faces = [
    { n: [1, 0, 0], verts: [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)] },
    { n: [-1, 0, 0], verts: [v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1), v(-1, -1, -1)] },
    { n: [0, 1, 0], verts: [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)] },
    { n: [0, -1, 0], verts: [v(-1, -1, 1), v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1)] },
    { n: [0, 0, 1], verts: [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)] },
    { n: [0, 0, -1], verts: [v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1)] },
  ];
  return faces.map((f) => ({ normal: new THREE.Vector3(f.n[0], f.n[1], f.n[2]), verts: f.verts, outer: true }));
}

// Оставляет часть многогранника, где n·p <= d
function clipPoly(faces: Face[], n: THREE.Vector3, d: number): Face[] {
  const out: Face[] = [];
  const cut: THREE.Vector3[] = [];
  for (const face of faces) {
    const res: THREE.Vector3[] = [];
    const vs = face.verts;
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i];
      const b = vs[(i + 1) % vs.length];
      const da = n.dot(a) - d;
      const db = n.dot(b) - d;
      if (da <= EPS) res.push(a);
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) {
        const p = a.clone().lerp(b, da / (da - db));
        res.push(p);
        cut.push(p);
      } else if (Math.abs(da) <= EPS) {
        cut.push(a);
      }
    }
    if (res.length >= 3) out.push({ ...face, verts: res });
  }

  // Крышка по плоскости разреза
  const uniq: THREE.Vector3[] = [];
  for (const p of cut) if (!uniq.some((q) => q.distanceToSquared(p) < 1e-10)) uniq.push(p);
  if (uniq.length >= 3) {
    const c = uniq.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(uniq.length);
    const u = new THREE.Vector3().subVectors(uniq[0], c).normalize();
    const w = new THREE.Vector3().crossVectors(n, u);
    uniq.sort((p, q) => {
      const dp = new THREE.Vector3().subVectors(p, c);
      const dq = new THREE.Vector3().subVectors(q, c);
      return Math.atan2(dp.dot(w), dp.dot(u)) - Math.atan2(dq.dot(w), dq.dot(u));
    });
    out.push({ normal: n.clone(), verts: uniq, outer: false });
  }
  return out;
}

// UV для внешних граней, чтобы текст читался снаружи
function faceUV(p: THREE.Vector3, n: THREE.Vector3, h: number): [number, number] {
  const s = (x: number) => (x / h + 1) / 2;
  if (n.x > 0.5) return [s(-p.z), s(p.y)];
  if (n.x < -0.5) return [s(p.z), s(p.y)];
  if (n.y > 0.5) return [s(p.x), s(-p.z)];
  if (n.y < -0.5) return [s(p.x), s(p.z)];
  if (n.z > 0.5) return [s(p.x), s(p.y)];
  return [s(-p.x), s(p.y)];
}

function gauss() {
  return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
}

export function fractureCube({ size = 2, count = 46, impact = new THREE.Vector3(0, 1, 0) } = {}): Shard[] {
  const h = size / 2;
  const seeds: THREE.Vector3[] = [];
  const clamp = (x: number) => Math.max(-h * 0.98, Math.min(h * 0.98, x));
  for (let i = 0; i < count; i++) {
    // ~45% сидов кучкуются вдоль канала древка — там осколки мельче
    if (i < count * 0.45) {
      const r = 0.32 * h;
      seeds.push(new THREE.Vector3(clamp(impact.x + gauss() * r), (Math.random() * 2 - 1) * h * 0.98, clamp(impact.z + gauss() * r)));
    } else {
      seeds.push(new THREE.Vector3((Math.random() * 2 - 1) * h, (Math.random() * 2 - 1) * h, (Math.random() * 2 - 1) * h));
    }
  }

  const shards: Shard[] = [];
  for (let i = 0; i < seeds.length; i++) {
    let poly = cubePoly(h);
    for (let j = 0; j < seeds.length && poly.length; j++) {
      if (i === j) continue;
      const n = new THREE.Vector3().subVectors(seeds[j], seeds[i]);
      if (n.lengthSq() < 1e-12) continue;
      n.normalize();
      const mid = new THREE.Vector3().addVectors(seeds[i], seeds[j]).multiplyScalar(0.5);
      poly = clipPoly(poly, n, n.dot(mid));
    }
    if (poly.length < 4) continue;

    const center = new THREE.Vector3();
    let nv = 0;
    for (const f of poly) for (const v of f.verts) { center.add(v); nv++; }
    center.divideScalar(nv);

    const outerPos: number[] = [], outerUV: number[] = [], innerPos: number[] = [];
    let radius = 0;
    for (const f of poly) {
      const vs = f.verts;
      for (const v of vs) radius = Math.max(radius, v.distanceTo(center));
      for (let k = 1; k < vs.length - 1; k++) {
        let tri = [vs[0], vs[k], vs[k + 1]];
        const tn = new THREE.Vector3().crossVectors(
          new THREE.Vector3().subVectors(tri[1], tri[0]),
          new THREE.Vector3().subVectors(tri[2], tri[0]),
        );
        if (tn.lengthSq() < 1e-14) continue;
        if (tn.dot(f.normal) < 0) tri = [tri[0], tri[2], tri[1]];
        for (const p of tri) {
          const target = f.outer ? outerPos : innerPos;
          target.push(p.x - center.x, p.y - center.y, p.z - center.z);
          if (f.outer) outerUV.push(...faceUV(p, f.normal, h));
        }
      }
    }

    const pos = new Float32Array([...outerPos, ...innerPos]);
    const uv = new Float32Array(pos.length / 3 * 2);
    uv.set(outerUV);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.addGroup(0, outerPos.length / 3, 0);
    g.addGroup(outerPos.length / 3, innerPos.length / 3, 1);
    g.computeVertexNormals();
    shards.push({ geometry: g, center, radius });
  }
  return shards;
}
