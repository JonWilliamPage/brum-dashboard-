import type { Metadata } from 'next';
import SiteFooter from '@/app/components/SiteFooter';
import BullAscii from '@/app/components/BullAscii';
import { SOURCES } from '@/lib/sources';

export const metadata: Metadata = {
  title: 'Data Sources · Ozzy',
  description: 'Every dataset behind the Birmingham Ozzy dashboard — official source, as-of date, and the script that pulled it.',
};

export default function SourcesPage() {
  const sources = Object.values(SOURCES);

  return (
    <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Hero strip */}
      <section style={{ position: 'relative', background: 'var(--herald-navy)', padding: '52px 32px', overflow: 'hidden', borderBottom: '3px solid var(--herald-gold)' }}>
        <BullAscii
          animate={false}
          displayWidth={200}
          style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', margin: 0, opacity: 0.07, pointerEvents: 'none' }}
        />
        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.22em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
            Data Sources &amp; Provenance
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 46, color: '#f5f3ee', lineHeight: 1.1, margin: '0 0 14px', fontWeight: 400, letterSpacing: '-.015em' }}>
            Every number, traced to an official source.
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'rgba(245,243,238,.78)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 16px' }}>
            Each dataset below lists its official source, the as-of date, and the committed script that pulled it — so anyone can reproduce it. Nothing is modelled or synthesised: if a value can&apos;t be sourced, it shows as &ldquo;—&rdquo; in the dashboard, never as an estimate.
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(245,243,238,.55)', lineHeight: 1.6, maxWidth: 720, margin: 0, fontStyle: 'italic' }}>
            Ozzy is an independent, open-source project. Listing a source here credits its data provider — it does not imply that provider operates, endorses, or is affiliated with Ozzy.
          </p>
        </div>
      </section>

      {/* Body */}
      <section style={{ background: 'var(--paper)', padding: '48px 32px 72px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>

          {sources.map(s => (
            <div
              key={s.id}
              id={s.id}
              style={{
                scrollMarginTop: 80,
                background: 'var(--surface)',
                border: '1px solid var(--border-solid)',
                borderTop: '3px solid var(--herald-gold)',
                borderRadius: 'var(--radius)',
                padding: '20px 24px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5, maxWidth: 620 }}>{s.source}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, padding: '8px 16px', background: 'var(--herald-navy)', color: '#f5f3ee', textDecoration: 'none' }}>
                    Dataset ↗
                  </a>
                  <a href={s.scriptUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, padding: '8px 16px', border: '1px solid var(--herald-navy)', color: 'var(--herald-navy)', textDecoration: 'none' }}>
                    Fetch script ↗
                  </a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 18 }}>
                {[
                  { k: 'Publisher', v: s.publisher },
                  { k: 'Dataset ID', v: s.datasetId, mono: true },
                  { k: 'As of', v: s.asOf },
                  { k: 'Licence', v: s.licence },
                ].map(f => (
                  <div key={f.k}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 3 }}>{f.k}</div>
                    <div style={{ fontFamily: f.mono ? 'var(--mono)' : 'var(--sans)', fontSize: f.mono ? 11 : 12.5, color: 'var(--ink)', lineHeight: 1.4, wordBreak: 'break-word' }}>{f.v}</div>
                  </div>
                ))}
              </div>

              {s.note && (
                <p style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {s.note}
                </p>
              )}
            </div>
          ))}

          {/* In-migration note */}
          <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border-solid)', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
              Base geography: Birmingham LAD <strong>E08000025</strong> · 69 official wards (codes E05011118–E05011186).
            </div>
            <div>
              Remaining dashboards (employment, housing, fiscal, youth) are being migrated to this same standard — each will appear here once it is wired to a verified official source. Until then their figures are withheld rather than modelled.
            </div>
          </div>

        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
