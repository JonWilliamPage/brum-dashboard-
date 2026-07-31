'use client';

import type { CrimeObsData } from '@/lib/types';

// Outcomes — how the latest month's recorded cases were disposed. This is the
// "evidence brief" panel: it reads like an annotated finding rather than a counter,
// and it is explicitly labelled provisional because most recent-month cases are
// still under investigation and the outcome mix shifts as cases close.
interface Props {
  data: CrimeObsData;
}

// Bucket the raw outcome strings into an honest, readable set. Order = narrative.
const BUCKETS: { label: string; color: string; match: (k: string) => boolean; note?: string }[] = [
  { label: 'Still under investigation', color: '#b01225', match: k => /under investigation/i.test(k), note: 'Not yet resolved' },
  { label: 'Investigation complete — no suspect identified', color: '#7d4e36', match: k => /no suspect identified/i.test(k) },
  { label: 'Unable to prosecute suspect', color: '#eda100', match: k => /unable to prosecute/i.test(k) },
  { label: 'Awaiting court outcome', color: '#2a78d6', match: k => /awaiting court/i.test(k) },
  { label: 'Formal action (charge / caution / penalty)', color: '#008300', match: k => /charge|caution|penalty|summons/i.test(k) },
  { label: 'Local / informal resolution', color: '#1baf7a', match: k => /local resolution|another organisation|not in the public interest/i.test(k) },
  { label: 'Not yet recorded', color: '#8a8f99', match: k => /not yet recorded/i.test(k) },
];

export default function CrimeObsOutcomes({ data }: Props) {
  const latest = data.as_of;
  const raw = data.city.outcomes_by_month[latest] ?? {};
  const total = Object.values(raw).reduce((s, n) => s + n, 0) || 1;

  // Fold each raw outcome into its bucket (first matching rule wins).
  const counts = BUCKETS.map(b => ({ ...b, n: 0 }));
  for (const [k, n] of Object.entries(raw)) {
    const idx = counts.findIndex(b => b.match(k));
    counts[idx >= 0 ? idx : counts.length - 1].n += n;
  }
  const used = counts.filter(b => b.n > 0);

  const unresolved = (counts[0].n + counts[1].n + counts[2].n) / total;
  const formal = counts[4].n / total;

  return (
    <div>
      <div className="bill-sec-ttl">What happened to the {total.toLocaleString()} cases recorded in {latest}</div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.7, color: 'var(--ink)',
        background: 'rgba(176,18,37,.05)', border: '1px solid rgba(176,18,37,.25)',
        borderLeft: '3px solid #b01225', padding: '10px 12px', marginBottom: 16,
      }}>
        In {latest}, <strong>{(unresolved * 100).toFixed(0)}%</strong> of recorded cases had not reached a formal
        outcome — still under investigation, closed with no suspect identified, or not prosecutable.{' '}
        <strong>{(formal * 100).toFixed(1)}%</strong> resulted in a charge, caution or penalty.
      </div>

      {/* 100% stacked outcome bar */}
      <div style={{ display: 'flex', height: 34, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 18 }}>
        {used.map(b => (
          <div
            key={b.label}
            title={`${b.label} — ${b.n.toLocaleString()} (${((b.n / total) * 100).toFixed(1)}%)`}
            style={{ width: `${(b.n / total) * 100}%`, background: b.color, height: '100%' }}
          />
        ))}
      </div>

      {/* Ranked outcome rows */}
      <div className="crime-cats">
        {used.map(b => {
          const pct = (b.n / total) * 100;
          return (
            <div key={b.label} className="crime-cat-row" style={{ marginBottom: 8 }}>
              <div className="crime-cat-lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{b.label}{b.note ? <span style={{ color: 'var(--muted2)', fontSize: 9 }}> · {b.note}</span> : null}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{b.n.toLocaleString()} · {pct.toFixed(1)}%</span>
              </div>
              <div className="crime-cat-bar-wrap">
                <div className="crime-cat-bar-fill" style={{ width: `${pct}%`, background: b.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 14, lineHeight: 1.6 }}>
        Provisional: outcome categories describe each case's <em>last recorded</em> status at extract time and are
        dominated by &ldquo;under investigation&rdquo; for recent months. The mix shifts as cases close, so this panel
        is a snapshot of case progress — not a stable clearance rate. Source: West Midlands Police via City Observatory.
      </div>
    </div>
  );
}
