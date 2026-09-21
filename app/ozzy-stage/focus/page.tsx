'use client';

import { useEffect, useState } from 'react';
import type { OzzyStageData } from '@/lib/types';
import OzzyStageView from '../components/OzzyStageView';

export default function OzzyStageFocusPage() {
  const [data, setData] = useState<OzzyStageData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = 'Ozzy Stage · Ozzy';
    fetch('/data/ozzy-stage.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.wards && j?.uc && j?.pip) {
          setData({
            as_of: j.as_of ?? '',
            sources: j.sources ?? [],
            uc: j.uc,
            pip: j.pip,
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
        <OzzyStageView data={data} focusMode />
      ) : (
        <p className="stage-focus-loading">{failed ? "Couldn't load this view's data." : 'Loading…'}</p>
      )}
    </div>
  );
}
