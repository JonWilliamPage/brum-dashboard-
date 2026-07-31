'use client';

/**
 * Birmingham growth stage: solid extruded ward blocks (no wireframe, no UK).
 * Hover → name/count (screen-space pick); click → pin. Heights lerp on play.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RAMP } from '@/lib/constants';
import { fetchWardBoundaries } from '@/lib/fetch-ward-boundaries';
import {
  buildCityLayout,
  extrudeWard,
  hexToRgb,
  type CityLayout,
  type WardShape,
} from '@/lib/ward-mesh';

export interface StageWard {
  ward_code: string;
  ward_name: string;
  value: number | null;
}

interface Props {
  wards: StageWard[];
  max?: number;
  selected?: string | null;
  onSelect?: (code: string | null) => void;
  unitLabel?: string;
  autoRotate?: boolean;
  maxHeight?: number;
}

const MIN_BLOCK = 0.14;
/** Base pixel radius for hover pick at reference camera distance. */
const HOVER_PX_BASE = 42;
const HOVER_DIST_REF = 14;

function rampColor(t: number): string {
  const i = Math.round(Math.max(0, Math.min(1, t)) * 9);
  return RAMP[i];
}

function makeSolidGeo(shape: WardShape) {
  const raw = extrudeWard(shape, 1);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(raw.positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(raw.normals, 3));
  geom.setIndex(new THREE.BufferAttribute(raw.indices, 1));
  return geom;
}

function WardBlock({
  shape,
  targetH,
  color,
  selected,
  hovered,
}: {
  shape: WardShape;
  targetH: number;
  color: string;
  selected: boolean;
  hovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentH = useRef(MIN_BLOCK);
  const [cr, cg, cb] = hexToRgb(color);
  const geo = useMemo(() => makeSolidGeo(shape), [shape]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const goal = Math.max(targetH, MIN_BLOCK);
    currentH.current += (goal - currentH.current) * Math.min(1, dt * 5.5);
    mesh.scale.y = currentH.current;
  });

  useEffect(() => () => geo.dispose(), [geo]);

  const lit = selected || hovered;

  return (
    <mesh ref={meshRef} geometry={geo} castShadow receiveShadow scale={[1, MIN_BLOCK, 1]}>
      <meshStandardMaterial
        color={new THREE.Color(cr, cg, cb)}
        roughness={0.55}
        metalness={0.04}
        flatShading={false}
        emissive={lit ? new THREE.Color(selected ? '#b01225' : '#3a2a1a') : new THREE.Color('#000')}
        emissiveIntensity={selected ? 0.22 : hovered ? 0.12 : 0}
      />
    </mesh>
  );
}

/**
 * World-anchored label that grows when zoomed in / shrinks when zoomed out.
 * (Default Html without distanceFactor is fixed screen size — wrong for zoom.)
 */
function FloatLabel({
  shape,
  value,
  name,
  unitLabel,
  height,
}: {
  shape: WardShape;
  value: number | null;
  name: string;
  unitLabel: string;
  height: number;
}) {
  const { camera } = useThree();
  const wrapRef = useRef<HTMLDivElement>(null);
  const world = useMemo(
    () => new THREE.Vector3(shape.center[0], height + 0.55, shape.center[1]),
    [shape.center, height]
  );

  useFrame(() => {
    const el = wrapRef.current;
    if (!el) return;
    const dist = camera.position.distanceTo(world);
    // Closer → larger tile (cap so it never covers the city)
    const s = Math.min(2.4, Math.max(0.55, HOVER_DIST_REF / Math.max(dist, 4)));
    el.style.transform = `scale(${s})`;
  });

  return (
    <Html
      position={[shape.center[0], height + 0.55, shape.center[1]]}
      center
      style={{ pointerEvents: 'none' }}
      zIndexRange={[100, 0]}
    >
      <div ref={wrapRef} className="stage-float-label-wrap">
        <div className="stage-float-label">
          <strong>{name}</strong>
          <span>
            {value != null ? value.toLocaleString('en-GB') : '—'} {unitLabel}
          </span>
        </div>
      </div>
    </Html>
  );
}

/**
 * Pick ward by nearest projected centroid — reliable with OrbitControls + Y-scale.
 */
function PointerPick({
  layout,
  heights,
  onHover,
  onPick,
}: {
  layout: CityLayout;
  heights: Record<string, number>;
  onHover: (code: string | null) => void;
  onPick: (code: string | null) => void;
}) {
  const { camera, gl } = useThree();
  const last = useRef<string | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef({ x: 0, y: 0, down: false, moved: false });

  useEffect(() => {
    const el = gl.domElement;

    const nearest = (clientX: number, clientY: number): string | null => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      // Enlarge pick radius when zoomed in so hover still feels natural
      const camDist = camera.position.length();
      const hoverPx = Math.min(
        110,
        Math.max(28, HOVER_PX_BASE * (HOVER_DIST_REF / Math.max(camDist, 5)))
      );
      let best: string | null = null;
      let bestD = hoverPx;
      for (const shape of layout.wards) {
        const h = heights[shape.code] ?? MIN_BLOCK;
        tmp.set(shape.center[0], h * 0.55, shape.center[1]);
        tmp.project(camera);
        if (tmp.z > 1) continue; // behind camera
        const sx = (tmp.x * 0.5 + 0.5) * rect.width;
        const sy = (-tmp.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - mx, sy - my);
        if (d < bestD) {
          bestD = d;
          best = shape.code;
        }
      }
      return best;
    };

    const onMove = (ev: PointerEvent) => {
      // While dragging to orbit, don't thrash hover
      if (drag.current.down) {
        if (Math.hypot(ev.clientX - drag.current.x, ev.clientY - drag.current.y) > 5) {
          drag.current.moved = true;
        }
        return;
      }
      const code = nearest(ev.clientX, ev.clientY);
      if (code !== last.current) {
        last.current = code;
        onHover(code);
        el.style.cursor = code ? 'pointer' : 'grab';
      }
    };

    const onDown = (ev: PointerEvent) => {
      drag.current = { x: ev.clientX, y: ev.clientY, down: true, moved: false };
    };
    const onUp = (ev: PointerEvent) => {
      if (drag.current.down && !drag.current.moved) {
        const code = nearest(ev.clientX, ev.clientY);
        onPick(code);
      }
      drag.current.down = false;
      drag.current.moved = false;
      // Refresh hover after orbit drag ends
      const code = nearest(ev.clientX, ev.clientY);
      last.current = code;
      onHover(code);
      el.style.cursor = code ? 'pointer' : 'grab';
    };
    const onLeave = () => {
      last.current = null;
      drag.current.down = false;
      onHover(null);
      el.style.cursor = 'grab';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [camera, gl, layout.wards, heights, onHover, onPick, tmp]);

  return null;
}

function CityScene({
  layout,
  valueByCode,
  max,
  selected,
  onSelect,
  autoRotate,
  maxHeight,
  unitLabel,
  onFocus,
}: {
  layout: CityLayout;
  valueByCode: Record<string, { value: number | null; name: string }>;
  max: number;
  selected?: string | null;
  onSelect?: (code: string | null) => void;
  autoRotate: boolean;
  maxHeight: number;
  unitLabel: string;
  onFocus?: (info: { name: string; value: number | null } | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const heights = useMemo(() => {
    const m: Record<string, number> = {};
    for (const shape of layout.wards) {
      const v = valueByCode[shape.code]?.value ?? null;
      const t = v != null && max > 0 ? v / max : 0;
      m[shape.code] = MIN_BLOCK + t * maxHeight;
    }
    return m;
  }, [layout.wards, valueByCode, max, maxHeight]);

  const focusCode = hovered ?? selected ?? null;
  const focusShape = focusCode ? layout.wards.find((w) => w.code === focusCode) : undefined;
  const focusVal = focusCode ? valueByCode[focusCode]?.value ?? null : null;
  const focusName = focusCode
    ? valueByCode[focusCode]?.name ?? focusShape?.name ?? ''
    : '';
  const focusH = focusCode ? heights[focusCode] ?? MIN_BLOCK : MIN_BLOCK;

  useEffect(() => {
    if (!onFocus) return;
    if (!focusCode) {
      onFocus(null);
      return;
    }
    onFocus({ name: focusName, value: focusVal });
  }, [focusCode, focusName, focusVal, onFocus]);

  useFrame((_, dt) => {
    if (autoRotate && group.current) group.current.rotation.y += dt * 0.08;
  });

  return (
    <>
      <color attach="background" args={['#f0ebe3']} />
      <fog attach="fog" args={['#f0ebe3', 28, 55]} />
      <ambientLight intensity={0.82} />
      <directionalLight
        castShadow
        position={[10, 18, 8]}
        intensity={1.05}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <directionalLight position={[-8, 10, -6]} intensity={0.35} />
      <hemisphereLight args={['#fff8f0', '#8a8a80', 0.4]} />

      <group ref={group}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <circleGeometry args={[14, 48]} />
          <meshStandardMaterial color="#e2ddd3" roughness={1} metalness={0} />
        </mesh>

        {layout.wards.map((shape) => {
          const entry = valueByCode[shape.code];
          const v = entry?.value ?? null;
          const t = v != null && max > 0 ? v / max : 0;
          const h = MIN_BLOCK + t * maxHeight;
          const isSel = selected === shape.code;
          const col = isSel ? '#b01225' : rampColor(t);
          return (
            <WardBlock
              key={shape.code}
              shape={shape}
              targetH={h}
              color={col}
              selected={isSel}
              hovered={hovered === shape.code}
            />
          );
        })}

        {focusShape && (
          <FloatLabel
            shape={focusShape}
            value={focusVal}
            name={focusName}
            unitLabel={unitLabel}
            height={focusH}
          />
        )}
      </group>

      <PointerPick
        layout={layout}
        heights={heights}
        onHover={setHovered}
        onPick={(code) => onSelect?.(code)}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={28}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.25}
        target={[0, maxHeight * 0.25, 0]}
      />
    </>
  );
}

export default function WardExtrusionStage({
  wards,
  max: maxProp,
  selected,
  onSelect,
  unitLabel = '',
  autoRotate = false,
  maxHeight = 2.6,
}: Props) {
  const [layout, setLayout] = useState<CityLayout | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [focusHud, setFocusHud] = useState<{ name: string; value: number | null } | null>(null);

  const codeKey = useMemo(
    () =>
      wards
        .map((w) => w.ward_code)
        .sort()
        .join(','),
    [wards]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const geo = await fetchWardBoundaries();
        if (cancelled) return;
        const codes = new Set(codeKey.split(',').filter(Boolean));
        const built = buildCityLayout(geo, codes, 10);
        if (!built.wards.length) throw new Error('No ward polygons matched the dataset codes');
        setLayout(built);
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeKey]);

  const valueByCode = useMemo(() => {
    const m: Record<string, { value: number | null; name: string }> = {};
    for (const w of wards) m[w.ward_code] = { value: w.value, name: w.ward_name };
    return m;
  }, [wards]);

  const max = maxProp ?? Math.max(...wards.map((w) => w.value ?? 0), 1);

  if (err) {
    return <div className="stage-fallback">3D stage failed: {err}</div>;
  }
  if (!layout) {
    return <div className="stage-fallback">⠋ building Birmingham stage…</div>;
  }

  return (
    <div className="stage-root">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [6, 9, 11], fov: 38, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <CityScene
          layout={layout}
          valueByCode={valueByCode}
          max={max}
          selected={selected}
          onSelect={onSelect}
          autoRotate={autoRotate}
          maxHeight={maxHeight}
          unitLabel={unitLabel}
          onFocus={setFocusHud}
        />
      </Canvas>
      <div className="stage-hud">
        <span className="stage-hud-tag">BIRMINGHAM · 69 WARDS</span>
        <span className="stage-hud-msg">Hover a ward · drag to orbit · Play walks the years</span>
      </div>
      {focusHud && (
        <div className="stage-hover-hud" data-testid="stage-hover-hud">
          <strong>{focusHud.name}</strong>
          <span>
            {focusHud.value != null ? focusHud.value.toLocaleString('en-GB') : '—'} {unitLabel}
          </span>
        </div>
      )}
      <div className="stage-legend">
        <span>Lower</span>
        {RAMP.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
        <span>Higher</span>
      </div>
    </div>
  );
}
