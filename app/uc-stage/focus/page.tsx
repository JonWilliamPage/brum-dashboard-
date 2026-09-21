'use client';

import { useEffect, useState } from 'react';
import type { UcWeatherData } from '@/lib/types';
import UcStageView from '../components/UcStageView';
import FocusCloseButton from '../../components/stage/FocusCloseButton';

export default function UcStageFocusPage() {
  const [data, setData] = useState<UcWeatherData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = 'UC Stage 3D · Ozzy';
    fetch('/data/uc-stage.json', { cache: 'no-store' })
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
        <UcStageView data={data} focusMode />
      ) : (
        <>
          <FocusCloseButton />
          <p className="stage-focus-loading">{failed ? "Couldn't load this view's data." : 'Loading…'}</p>
        </>
      )}
    </div>
  );
}
