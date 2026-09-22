'use client';

import { useEffect, useRef, useState } from 'react';
import type { CrimeWard } from '@/lib/types';
import { CRIME_RAMP } from '@/lib/constants';
import { fetchWardBoundaries } from '@/lib/fetch-ward-boundaries';

interface Props {
  wards: CrimeWard[];
  onSelect: (code: string) => void;
}

export default function CrimeMap({ wards, onSelect }: Props) {
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

    const maxRate = Math.max(...wards.map(w => w.crime_rate_per_1000));
    const wardIndex = Object.fromEntries(wards.map(w => [w.ward_code, w]));

    const rampColor = (rate: number) => {
      const idx = Math.round((rate / maxRate) * 9);
      return CRIME_RAMP[Math.max(0, Math.min(9, idx))];
    };

    (async () => {
      try {
        const [L, geo] = await Promise.all([
          import('leaflet').then(m => m.default),
          fetchWardBoundaries(),
        ]);
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;

        const map = L.map(container, { zoomControl: true, scrollWheelZoom: true })
          .setView([52.48, -1.9], 11);
        mapInstance = map;
        if (cancelled) { map.remove(); return; }

        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }).addTo(map);

        L.geoJSON(geo, {
          style: feat => {
            const w = wardIndex[feat?.properties?.WD22CD ?? ''];
            return {
              fillColor: w ? rampColor(w.crime_rate_per_1000) : '#ccc',
              fillOpacity: 0.7,
              color: '#f5f3ee',
              weight: 1.2,
            };
          },
          onEachFeature: (feat, layer) => {
            const code = feat.properties?.WD22CD ?? '';
            const w = wardIndex[code];
            if (w) {
              layer.bindTooltip(`<b>${w.ward_name}</b><br>${w.crime_rate_per_1000.toFixed(1)} crimes/1000<br>Rank #${w.crime_rank}`, { sticky: true });
              layer.on('click', () => onSelect(code));
            }
          },
        }).addTo(map);

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
      if (mapInstance) {
        try { mapInstance.remove(); } catch { /* already gone */ }
        mapInstance = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={containerRef} className="map-container" style={{ height: '100%', minHeight: 420 }} />
      {status !== 'ready' && (
        <div className="map-loading" style={{ position: 'absolute', inset: 0, zIndex: 1100 }}>
          {status === 'loading'
            ? <span>Loading ward boundaries…</span>
            : <span style={{ color: 'var(--q-disad)', fontFamily: 'var(--mono)', fontSize: 11 }}>⚠ Map unavailable: {errMsg}</span>}
        </div>
      )}
    </div>
  );
}
