'use client';

import { useEffect, useRef, useState } from 'react';
import type { Ward } from '@/lib/types';
import { dc, RAMP, MUTED } from '@/lib/constants';
import { fetchWardBoundaries } from '@/lib/fetch-ward-boundaries';

interface Props {
  wards: Ward[];
  onSelect: (code: string) => void;
}

export default function MapView({ wards, onSelect }: Props) {
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

    (async () => {
      try {
        const [L, geo] = await Promise.all([
          import('leaflet').then(m => m.default),
          fetchWardBoundaries(),
        ]);
        if (cancelled) return;

        // Defensive: clear any prior Leaflet init left on this node by a previous mount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;

        const map = L.map(container).setView([52.48, -1.90], 11);
        mapInstance = map;
        if (cancelled) { map.remove(); return; }

        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, pane: 'shadowPane' }).addTo(map);

        L.geoJSON(geo, {
          style: (f) => {
            const w = wards.find(x => x.ward_code === f?.properties?.WD22CD);
            if (!w) return { fillColor: '#ddd6cc', fillOpacity: 0.5, color: '#bbb', weight: 1 };
            return { fillColor: dc(w.composite_decile), fillOpacity: 0.7, color: '#f5f3ee', weight: 1.2 };
          },
          onEachFeature: (f, layer) => {
            const w = wards.find(x => x.ward_code === f.properties?.WD22CD);
            if (!w) return;
            layer.on('click', () => onSelect(w.ward_code));
            layer.on('mouseover', (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.9, weight: 2 }));
            layer.on('mouseout', (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.7, weight: 1.2 }));
            (layer as L.Layer & { bindTooltip: (s: string, o: object) => void }).bindTooltip(
              `<b>${w.ward_name}</b><br>Claimant: ${w.claimant_rate}%<br>Score: ${(w.composite * 100).toFixed(0)} · D${w.composite_decile}`,
              { className: 'map-tooltip', sticky: true }
            );
          },
        }).addTo(map);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legend = (L as any).control({ position: 'bottomleft' });
        legend.onAdd = () => {
          const d = L.DomUtil.create('div', 'map-legend');
          d.innerHTML = `<div class="map-legend-title">Composite disadvantage</div><div style="display:flex;gap:2px;align-items:center"><span style="font-size:9px;color:${MUTED};margin-right:3px">Low</span>${RAMP.map(c => `<div style="width:14px;height:14px;background:${c}"></div>`).join('')}<span style="font-size:9px;color:${MUTED};margin-left:3px">High</span></div>`;
          return d;
        };
        legend.addTo(map);

        // Container is mounted at full size from first render, but invalidate
        // once more in case a parent layout shift changed its dimensions.
        map.invalidateSize();
        setStatus('ready');

        // Leaflet doesn't notice later container resizes on its own (e.g.
        // opening Focus view, toggling the sidebar, rotating the phone) —
        // it just keeps rendering at its original size. Watch the container
        // and re-measure whenever it actually changes.
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
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} className="map-container" />
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
