'use client';

import { useEffect, useState } from 'react';
import type { PipPlaceData } from '@/lib/types';
import PipStageView from '../components/PipStageView';

export default function PipStageFocusPage() {
  const [data, setData] = useState<PipPlaceData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = 'PIP Stage 3D · Ozzy';
    fetch('/data/pip-stage.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.wards && j?.months && j?.city) {
          setData({
            as_of: j.as_of ?? '',
            sources: j.sources ?? [],
            months: j.months,
            month_keys: j.month_keys,
            city: j.city,
            wards: j.wards,
            category_mix: j.category_mix ?? { early_month: null, latest_month: null, early: [], latest: [] },
            gb_conditions: j.gb_conditions ?? null,
          });
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="stage-focus-page">
      {data ? (
        <PipStageView data={data} focusMode />
      ) : (
        <p className="stage-focus-loading">{failed ? "Couldn't load this view's data." : 'Loading…'}</p>
      )}
    </div>
  );
}
