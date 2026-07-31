'use client';

import { useEffect, useRef, useState } from 'react';
import { RAMP } from '@/lib/constants';
import { fetchWardBoundaries } from '@/lib/fetch-ward-boundaries';

export interface PlayableWard {
  ward_code: string;
  ward_name: string;
  /** value at current frame — set by parent */
  value: number | null;
}

interface Props {
  wards: PlayableWard[];
  /** max for ramp; if omitted, computed from current values */
  max?: number;
  unitLabel?: string;
  onSelect?: (code: string) => void;
  selected?: string | null;
}

export default function PlayableWardMap({ wards, max: maxProp, unitLabel = '', onSelect, selected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Init map once
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        const [L, geo] = await Promise.all([
          import('leaflet').then((m) => m.default),
          fetchWardBoundaries(),
        ]);
        if (cancelled) return;
        LRef.current = L;
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;

        const map = L.map(container, { zoomControl: true, scrollWheelZoom: true }).setView(
          [52.48, -1.9],
          11
        );
        mapRef.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap © CARTO',
          maxZoom: 18,
        }).addTo(map);

        const layer = L.geoJSON(geo, {
          style: () => ({
            fillColor: '#ccc',
            fillOpacity: 0.75,
            color: '#f5f3ee',
            weight: 1.2,
          }),
        }).addTo(map);
        layerRef.current = layer;
        map.invalidateSize();
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Restyle when values change
  useEffect(() => {
    const layer = layerRef.current;
    const L = LRef.current;
    if (!layer || !L || status !== 'ready') return;

    const idx = Object.fromEntries(wards.map((w) => [w.ward_code, w]));
    const max =
      maxProp ??
      Math.max(...wards.map((w) => w.value ?? 0), 1);

    const color = (v: number | null) => {
      if (v == null) return '#d0ccc4';
      const i = Math.round((v / max) * 9);
      return RAMP[Math.max(0, Math.min(9, i))];
    };

    layer.eachLayer((lyr: any) => {
      const code = lyr.feature?.properties?.WD22CD ?? '';
      const w = idx[code];
      const v = w?.value ?? null;
      lyr.setStyle({
        fillColor: color(v),
        fillOpacity: 0.78,
        color: selected === code ? '#b01225' : '#f5f3ee',
        weight: selected === code ? 2.2 : 1.2,
      });
      if (w) {
        const tip = `<b>${w.ward_name}</b><br>${v != null ? v.toLocaleString() : '—'} ${unitLabel}`;
        if (lyr.getTooltip()) lyr.setTooltipContent(tip);
        else lyr.bindTooltip(tip, { sticky: true });
        lyr.off('click');
        if (onSelect) lyr.on('click', () => onSelect(code));
      }
    });
  }, [wards, maxProp, unitLabel, onSelect, selected, status]);

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 360 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          ⠋ loading map…
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--herald-red)' }}>
          Map boundaries failed to load
        </div>
      )}
    </div>
  );
}
