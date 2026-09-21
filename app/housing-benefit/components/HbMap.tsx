'use client';

import { useEffect, useRef, useState } from 'react';
import type { HbArea } from '@/lib/types';
import { RAMP } from '@/lib/constants';

// Choropleth of the 7 West Midlands metropolitan boroughs — the TRUE geography of this
// dataset (no ward breakdown exists). Sequential ink ramp by Housing Benefit %, with
// Birmingham given a heavy red outline so the "highest in the region" reading survives.
// Boundaries: public/data/wm-boroughs.geojson (value-free geometry from the same source).
interface Props {
  areas: HbArea[];
}

export default function HbMap({ areas }: Props) {
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

    const maxVal = Math.max(...areas.map(a => a.value), 1);
    const byCode = Object.fromEntries(areas.map(a => [a.area_code, a]));
    const rampColor = (v: number) => RAMP[Math.max(0, Math.min(9, Math.round((v / maxVal) * 9)))];

    (async () => {
      try {
        const [L, geo] = await Promise.all([
          import('leaflet').then(m => m.default),
          fetch('/data/wm-boroughs.geojson', { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(`boundaries HTTP ${r.status}`);
            return r.json();
          }),
        ]);
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;

        const map = L.map(container, { zoomControl: true, scrollWheelZoom: true }).setView([52.5, -2.0], 10);
        mapInstance = map;
        if (cancelled) { map.remove(); return; }

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 18,
        }).addTo(map);

        const layer = L.geoJSON(geo, {
          style: feat => {
            const a = byCode[feat?.properties?.code ?? ''];
            const isBham = feat?.properties?.code === 'E08000025';
            return {
              fillColor: a ? rampColor(a.value) : '#ccc',
              fillOpacity: 0.78,
              color: isBham ? '#b01225' : '#f5f3ee',
              weight: isBham ? 3 : 1.2,
            };
          },
          onEachFeature: (feat, lyr) => {
            const a = byCode[feat.properties?.code ?? ''];
            const name = feat.properties?.name ?? '';
            if (a) lyr.bindTooltip(
              `<b>${name}</b><br>${a.value.toFixed(2)}% of households on Housing Benefit${a.is_birmingham ? ' — highest in the region' : ''}`,
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
            ? <span>Loading borough boundaries…</span>
            : <span style={{ color: 'var(--q-disad)', fontFamily: 'var(--mono)', fontSize: 11 }}>⚠ Map unavailable: {errMsg}</span>}
        </div>
      )}
    </div>
  );
}
