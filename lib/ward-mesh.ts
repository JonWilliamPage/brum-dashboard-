// Birmingham ward polygons → unit-scale city stage for Three.js.
// Flat XZ plane = map; +Y = intensity (caseload). Solid extruded blocks only.

import earcut from 'earcut';

export type Pos2 = [number, number];

export interface WardShape {
  code: string;
  name: string;
  rings: Pos2[][];
  flat: Float32Array;
  indices: Uint32Array;
  center: Pos2;
}

export interface CityLayout {
  wards: WardShape[];
  citySize: number;
  bhamSpan: number;
}

const ORIGIN_LAT = 52.486;
const ORIGIN_LNG = -1.89;
const M_PER_DEG_LAT = 111_320;

function mPerDegLng(lat: number) {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

export function projectLngLat(lng: number, lat: number): Pos2 {
  const x = (lng - ORIGIN_LNG) * mPerDegLng(ORIGIN_LAT);
  // North = -Z so the map sits naturally under a camera looking from SE
  const z = -((lat - ORIGIN_LAT) * M_PER_DEG_LAT);
  return [x, z];
}

function ringArea(ring: Pos2[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

function ensureWinding(ring: Pos2[], ccw: boolean): Pos2[] {
  const positive = ringArea(ring) > 0;
  if (positive === ccw) return ring;
  return [...ring].reverse();
}

function projectRing(coords: number[][]): Pos2[] {
  const pts: Pos2[] = [];
  for (const c of coords) {
    if (!c || c.length < 2) continue;
    pts.push(projectLngLat(c[0], c[1]));
  }
  if (pts.length > 1) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) pts.pop();
  }
  return pts;
}

/** Drop near-collinear points so walls read as clean solid prisms, not faceted radii. */
function simplifyRing(ring: Pos2[], minSeg: number, maxPts = 48): Pos2[] {
  if (ring.length <= 4) return ring;
  // First pass: drop tiny segments
  const coarse: Pos2[] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prev = coarse[coarse.length - 1];
    if (Math.hypot(ring[i][0] - prev[0], ring[i][1] - prev[1]) >= minSeg) {
      coarse.push(ring[i]);
    }
  }
  if (coarse.length < 3) return ring;
  // Ensure closed shape still has enough points
  if (coarse.length <= maxPts) return coarse;

  // Second pass: keep every Nth + corners (high turn angle)
  const step = Math.ceil(coarse.length / maxPts);
  const out: Pos2[] = [];
  for (let i = 0; i < coarse.length; i++) {
    if (i % step === 0) {
      out.push(coarse[i]);
      continue;
    }
    const a = coarse[(i - 1 + coarse.length) % coarse.length];
    const b = coarse[i];
    const c = coarse[(i + 1) % coarse.length];
    const abx = b[0] - a[0];
    const abz = b[1] - a[1];
    const bcx = c[0] - b[0];
    const bcz = c[1] - b[1];
    const lab = Math.hypot(abx, abz) || 1;
    const lbc = Math.hypot(bcx, bcz) || 1;
    const dot = (abx * bcx + abz * bcz) / (lab * lbc);
    // keep sharp corners
    if (dot < 0.85) out.push(b);
  }
  return out.length >= 3 ? out : coarse;
}

function triangulate(rings: Pos2[][]): { flat: Float32Array; indices: Uint32Array } {
  const vertices: number[] = [];
  const holes: number[] = [];
  let off = 0;
  rings.forEach((ring, ri) => {
    if (ri > 0) holes.push(off / 2);
    const oriented = ensureWinding(ring, ri === 0);
    for (const p of oriented) {
      vertices.push(p[0], p[1]);
      off += 2;
    }
  });
  const idx = earcut(vertices, holes.length ? holes : undefined, 2);
  return { flat: new Float32Array(vertices), indices: new Uint32Array(idx) };
}

function centroid(ring: Pos2[]): Pos2 {
  let sx = 0;
  let sz = 0;
  for (const p of ring) {
    sx += p[0];
    sz += p[1];
  }
  const n = ring.length || 1;
  return [sx / n, sz / n];
}

function bboxOfRings(ringsList: Pos2[][][]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const rings of ringsList) {
    for (const ring of rings) {
      for (const [x, z] of ring) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    span: Math.max(maxX - minX, maxZ - minZ, 1),
  };
}

function extractRings(g: GeoJSON.Geometry): Pos2[][][] {
  if (g.type === 'Polygon') {
    const rings = (g.coordinates as number[][][]).map(projectRing).filter((r) => r.length >= 3);
    return rings.length ? [rings] : [];
  }
  if (g.type === 'MultiPolygon') {
    const out: Pos2[][][] = [];
    for (const poly of g.coordinates as number[][][][]) {
      const rings = poly.map(projectRing).filter((r) => r.length >= 3);
      if (rings.length) out.push(rings);
    }
    return out;
  }
  return [];
}

function scaleRings(rings: Pos2[][], cx: number, cz: number, scale: number): Pos2[][] {
  return rings.map((ring) => ring.map(([x, z]): Pos2 => [(x - cx) * scale, (z - cz) * scale]));
}

function insetRings(rings: Pos2[][], factor: number): Pos2[][] {
  const c = centroid(rings[0]);
  return rings.map((ring, ri) =>
    ring.map(([x, z]): Pos2 => {
      const t = ri === 0 ? factor : Math.min(1, factor + 0.02);
      return [c[0] + (x - c[0]) * t, c[1] + (z - c[1]) * t];
    })
  );
}

function toShape(code: string, name: string, rings: Pos2[][]): WardShape | null {
  if (!rings[0] || rings[0].length < 3) return null;
  const { flat, indices } = triangulate(rings);
  if (!indices.length) return null;
  return { code, name, rings, flat, indices, center: centroid(rings[0]) };
}

/**
 * Birmingham-only layout. Wards scaled to ~`bhamSize` units, slight inset so
 * neighbours read as separate solid blocks without wireframe edges.
 */
export function buildCityLayout(
  bhamGeo: GeoJSON.FeatureCollection,
  codes: Set<string>,
  bhamSize = 10
): CityLayout {
  type Raw = { code: string; name: string; rings: Pos2[][] };
  const bhamRaw: Raw[] = [];

  for (const f of bhamGeo.features || []) {
    const code = String(f.properties?.WD22CD ?? '');
    if (!codes.has(code)) continue;
    const name = String(f.properties?.WD22NM ?? code);
    if (!f.geometry) continue;
    const parts = extractRings(f.geometry);
    let best: Pos2[][] | null = null;
    let bestLen = 0;
    for (const rings of parts) {
      if (rings[0].length > bestLen) {
        bestLen = rings[0].length;
        best = rings;
      }
    }
    if (best) bhamRaw.push({ code, name, rings: best });
  }

  const bhamBb = bboxOfRings(bhamRaw.map((w) => w.rings));
  const cx = bhamBb.cx;
  const cz = bhamBb.cz;
  const scale = bhamSize / bhamBb.span;

  // After scale, city is ~bhamSize units; drop segments shorter than this
  const minSeg = bhamSize * 0.012;
  const INSET = 0.97;

  const wards: WardShape[] = [];
  for (const w of bhamRaw) {
    const scaled = scaleRings(w.rings, cx, cz, scale);
    const simplified = scaled.map((ring, i) =>
      i === 0 ? simplifyRing(ring, minSeg, 40) : simplifyRing(ring, minSeg, 20)
    );
    const inset = insetRings(simplified, INSET);
    const shape = toShape(w.code, w.name, inset);
    if (shape) wards.push(shape);
  }

  return { wards, citySize: bhamSize + 1.5, bhamSpan: bhamSize };
}

/**
 * Solid prism extrusion: top, bottom, walls. Normals averaged for smooth fill
 * (no wireframe edges — shape comes from the silhouette alone).
 */
export function extrudeWard(
  shape: WardShape,
  height: number
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const h = Math.max(height, 0.02);
  const flat = shape.flat;
  const n = flat.length / 2;
  const pos: number[] = [];
  const idx: number[] = [];

  const push = (x: number, y: number, z: number) => {
    pos.push(x, y, z);
  };

  // Top face (y = h)
  for (let i = 0; i < n; i++) push(flat[i * 2], h, flat[i * 2 + 1]);
  // Bottom face (y = 0)
  for (let i = 0; i < n; i++) push(flat[i * 2], 0, flat[i * 2 + 1]);

  for (let i = 0; i < shape.indices.length; i += 3) {
    idx.push(shape.indices[i], shape.indices[i + 1], shape.indices[i + 2]);
  }
  const bot = n;
  for (let i = 0; i < shape.indices.length; i += 3) {
    idx.push(bot + shape.indices[i], bot + shape.indices[i + 2], bot + shape.indices[i + 1]);
  }

  // Side walls — unique verts per wall quad so normals stay vertical (solid look)
  const outer = ensureWinding(shape.rings[0], true);
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    const base = pos.length / 3;
    push(a[0], 0, a[1]);
    push(b[0], 0, b[1]);
    push(b[0], h, b[1]);
    push(a[0], h, a[1]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const positions = new Float32Array(pos);
  const normals = new Float32Array(pos.length);

  // Per-triangle normals, then average (smooth top/bottom, correct walls)
  for (let i = 0; i < idx.length; i += 3) {
    const i0 = idx[i] * 3;
    const i1 = idx[i + 1] * 3;
    const i2 = idx[i + 2] * 3;
    const ax = positions[i1] - positions[i0];
    const ay = positions[i1 + 1] - positions[i0 + 1];
    const az = positions[i1 + 2] - positions[i0 + 2];
    const bx = positions[i2] - positions[i0];
    const by = positions[i2 + 1] - positions[i0 + 1];
    const bz = positions[i2 + 2] - positions[i0 + 2];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const ii of [i0, i1, i2]) {
      normals[ii] += nx;
      normals[ii + 1] += ny;
      normals[ii + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  return { positions, normals, indices: new Uint32Array(idx) };
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
