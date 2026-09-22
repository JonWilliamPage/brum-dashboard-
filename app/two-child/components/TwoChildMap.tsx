'use client';

import { useEffect, useRef, useState } from 'react';
import type { TwoChildConstituency } from '@/lib/types';
import { RAMP } from '@/lib/constants';

// Choropleth of Birmingham's 9 parliamentary constituencies — the TRUE geography of
// the DWP two-child limit statistics (no ward breakdown exists). Ink ramp by
// households affected; the hardest-hit constituency gets the heraldic red outline.
// Boundaries: public/data/birmingham-constituencies.geojson (value-free geometry from
// City Observatory, same 2024 names + E14 codes as the DWP tables).
interface Props {
  constituencies: TwoChildConstituency[];
}

export default function TwoChildMap({ constituencies }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mapInstance: any = null;
    let ro: ResizeObserver | null = null;
    const container = containerRef.current;
    if (!container) return;

    const max = Math.max(...constituencies.map(c => c.households_affected), 1);
    const top = [...constituencies].sort((a, b) => b.households_affected - a.households_affected)[0]?.name;
    const byName = Object.fromEntries(constituencies.map(c => [c.name, c]));
    const rampColor = (v: number) => RAMP[Math.max(0, Math.min(9, Math.round((v / max) * 9)))];

    (async () => {
      try {
        const [L, geo] = await Promise.all([
          import('leaflet').then(m => m.default),
          fetch('/data/birmingham-constituencies.geojson', { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(`boundaries HTTP ${r.status}`);
            return r.json();
          }),
        ]);
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;

        const map = L.map(container, { zoomControl: true, scrollWheelZoom: true }).setView([52.48, -1.9], 11);
        mapInstance = map;
        if (cancelled) { map.remove(); return; }

        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }).addTo(map);

        const layer = L.geoJSON(geo, {
          style: feat => {
            const c = byName[feat?.properties?.name ?? ''];
            const isTop = feat?.properties?.name === top;
            return {
              fillColor: c ? rampColor(c.households_affected) : '#ccc',
              fillOpacity: 0.75,
              color: isTop ? '#b01225' : '#f5f3ee',
              weight: isTop ? 3 : 1.2,
            };
          },
          onEachFeature: (feat, lyr) => {
            const c = byName[feat.properties?.name ?? ''];
            if (c) lyr.bindTooltip(
              `<b>${c.name.replace('Birmingham ', '')}</b><br>${c.households_affected.toLocaleString()} households were affected<br>${c.children_affected?.toLocaleString() ?? '—'} children not receiving an element<br>derived gain +£${c.derived_annual_gain_m}m/yr${c.name === top ? ' — highest in the city' : ''}`,
              { sticky: true },
            );
          },
        }).addTo(map);

        try { map.fitBounds(layer.getBounds(), { padding: [12, 12] }); } catch { /* keep default view */ }
        map.invalidateSize();
        setStatus('ready');

        // Leaflet doesn't notice later container resizes (Focus view,
        // sidebar toggle, phone rotation) on its own — re-measure on change.
        ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(container);
      } catch (e) {
        if (cancelled) return;
        setErrMsg(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (ro) { ro.disconnect(); ro = null; }
      if (mapInstance) { try { mapInstance.remove(); } catch { /* gone */ } mapInstance = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={containerRef} className="map-container" style={{ height: '100%', minHeight: 420 }} />
      {status !== 'ready' && (
        <div className="map-loading" style={{ position: 'absolute', inset: 0, zIndex: 1100 }}>
          {status === 'loading'
            ? <span>Loading constituency boundaries…</span>
            : <span style={{ color: 'var(--q-disad)', fontFamily: 'var(--mono)', fontSize: 11 }}>⚠ Map unavailable: {errMsg}</span>}
        </div>
      )}
    </div>
  );
}
