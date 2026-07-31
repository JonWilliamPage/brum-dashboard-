'use client';

import { useEffect, useRef, useState } from 'react';
import type { FlyTipArea } from '@/lib/types';
import { RAMP } from '@/lib/constants';

// Choropleth of the 7 West Midlands metropolitan boroughs — true geography of this
// dataset (no ward breakdown). Birmingham outlined in herald red.
interface Props {
  areas: FlyTipArea[];
  asOf: string;
}

export default function FlyTipMap({ areas, asOf }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mapInstance: any = null;
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
            if (a) {
              lyr.bindTooltip(
                `<b>${name}</b><br>${a.value.toFixed(1)} incidents / 1,000 people · ${asOf}${a.is_birmingham ? ' — Birmingham' : ''}`,
                { sticky: true },
              );
            }
          },
        }).addTo(map);

        try { map.fitBounds(layer.getBounds(), { padding: [12, 12] }); } catch { /* keep default */ }
        map.invalidateSize();
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setErrMsg(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
  }, [areas, asOf]);

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 360 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
          Loading map…
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--herald-red)', padding: 24, textAlign: 'center' }}>
          Map failed: {errMsg}
        </div>
      )}
    </div>
  );
}
