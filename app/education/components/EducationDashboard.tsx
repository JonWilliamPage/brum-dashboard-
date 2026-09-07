'use client';

import { useState, useEffect, useRef } from 'react';
import type { EducationWard, EduDataMeta } from '@/lib/types';
import QualGrid from './QualGrid';
import QualTable from './QualTable';
import QualBars from './QualBars';
import EduDetailPanel from './EduDetailPanel';
import BullAscii from '../../components/BullAscii';

type Sub = 'grid' | 'table' | 'chart';

const BHAM_BANNER =
  ` ____    ___   ____   __  __   ___   _   _    ____   _   _    _    __  __ \n` +
  `| __ )  |_ _| |  _ \\ |  \\/  | |_ _| | \\ | |  / ___| | | | |  / \\  |  \\/  |\n` +
  `|  _ \\   | |  | |_) || |\\/| |  | |  |  \\| | | |  _  | |_| | / _ \\ | |\\/| |\n` +
  `| |_) |  | |  |  _ < | |  | |  | |  | |\\  | | |_| | |  _  |/ ___ \\| |  | |\n` +
  `|____/  |___| |_| \\_\\|_|  |_| |___| |_| \\_|  \\____| |_| |_/_/   \\_\\_|  |_|`;

interface Props {
  wards: EducationWard[];
  meta: EduDataMeta;
}

const SOURCES = [
  {
    name: 'Census 2021 — Highest Level of Qualification',
    endpoint: 'census-2021-highest-level-of-qualification-birmingham-wards',
    publisher: 'ONS / Birmingham City Observatory',
    href: 'https://cityobservatory.birmingham.gov.uk/explore/dataset/census-2021-highest-level-of-qualification-birmingham-wards/',
    apiHref: 'https://cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets/census-2021-highest-level-of-qualification-birmingham-wards/records',
    desc: 'Usual residents aged 16+ by highest level of qualification. All 69 Birmingham wards. Census 2021 (March 2021).',
    vintage: 'Census 2021',
  },
  {
    name: 'NOMIS — Census 2021 TS067 (Qualifications)',
    endpoint: 'NM_2084_1 / census2021-ts067-ward.csv',
    publisher: 'ONS / NOMIS',
    href: 'https://www.nomisweb.co.uk/sources/census_2021',
    apiHref: 'https://www.nomisweb.co.uk/output/census/2021/census2021-ts067-extra.zip',
    desc: 'Bulk ZIP download. Authoritative Census 2021 qualifications at ward level for all England & Wales. Filter to E05011xxx for Birmingham wards.',
    vintage: 'Census 2021',
  },
];

export default function EducationDashboard({ wards, meta }: Props) {
  const [ready, setReady]           = useState(false);
  const [sub, setSub]               = useState<Sub>('grid');
  const [selected, setSelected]     = useState<EducationWard | null>(null);
  const [showSources, setShowSources] = useState(false);
  const bannerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const lines = BHAM_BANNER.split('\n');
    el.innerHTML = lines
      .map(l => l.split('').map(c => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join(''))
      .join('<br>');
    const chars = el.querySelectorAll<HTMLElement>('.ch');
    const cols = lines[0].length;
    let col = 0;
    const tick = setInterval(() => {
      chars.forEach((c, i) => { if (i % cols === col) c.classList.add('in'); });
      col++;
      if (col >= cols) { clearInterval(tick); setTimeout(() => setReady(true), 300); }
    }, 12);
    return () => clearInterval(tick);
  }, []);

  // Stats
  const sorted      = [...wards].sort((a, b) => b.qual_none - a.qual_none);
  const avgNone     = (wards.reduce((s, w) => s + w.qual_none, 0) / wards.length).toFixed(1);
  const avgL4       = (wards.reduce((s, w) => s + w.qual_level4plus, 0) / wards.length).toFixed(1);
  const highDepriv  = wards.filter(w => w.skills_decile >= 8).length;

  return (
    <>
      {/* Loading overlay */}
      <div id="overlay" className={ready ? 'fade' : ''}>
        <div className="scan-line" />
        <pre className="bham-mega" ref={bannerRef} id="bham-mega" />
        <div className="load-meta">
          <div className="load-headline">Education Intelligence</div>
          <div className="load-sub">Birmingham City Council · Skills & Qualifications</div>
          <div className="t-log">
            <div className="t-line vis">
              <span className="t-ts">—</span>
              <span className="tbadge tb-info">INIT</span>
              <span className="t-msg"><b>{wards.length} wards</b> · Census 2021 · committed snapshot</span>
            </div>
          </div>
          <div className="t-prog-wrap"><div className="t-prog-fill" style={{ width: '100%' }} /></div>
        </div>
      </div>

      <div className="wrap" style={{ display: ready ? 'flex' : 'none' }}>

        {/* Header */}
        <div className="hdr" style={{ position: 'relative' }}>
          <div className="hdr-brand">
            <a href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textDecoration: 'none', padding: '4px 8px', border: '1px solid var(--border)', letterSpacing: '.04em', marginRight: 6 }}>
              ← Ozzy
            </a>
            <div className="bcc-badge" title="Birmingham City Council">
              <span>▶ FORWARD</span>B·C·C
            </div>
            <div>
              <div className="hdr-title">Birmingham — Education</div>
              <div className="hdr-sub">{meta.wards} wards · {meta.vintage}</div>
            </div>
          </div>
          <div />
          <div className="hdr-right">
            <span className="dsbadge" title="ONS Census 2021 (TS067) — committed snapshot, all 69 Birmingham wards">
              {meta.vintage} · {meta.wards} wards
            </span>
            <button className="refresh-btn" onClick={() => setShowSources(s => !s)}>
              <span>⌥</span> sources
            </button>
            <button className="print-btn" onClick={() => window.print()}>⎙ print</button>
          </div>

          {/* Sources drawer */}
          {showSources && (
            <div className="sources-drawer">
              <div className="sources-hdr">
                <h3>Data sources</h3>
                <button className="x" onClick={() => setShowSources(false)}>×</button>
              </div>
              {SOURCES.map(s => (
                <div className="src-row" key={s.name}>
                  <div className="src-row-top">
                    <span className="src-name">{s.name}</span>
                    <span className="src-status src-static">{s.vintage}</span>
                  </div>
                  <div className="src-meta">
                    {s.desc}
                    <br />
                    <span style={{ opacity: 0.7 }}>{s.publisher} · </span>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">View dataset ↗</a>
                    {' · '}
                    <a href={s.apiHref} target="_blank" rel="noopener noreferrer">API endpoint ↗</a>
                  </div>
                </div>
              ))}
              <div className="src-foot">
                All data is publicly available with no API key required. Education figures are a
                committed Census 2021 snapshot (ONS TS067 via NOMIS) — refreshed only on an ONS restatement.
              </div>
            </div>
          )}
        </div>

        <div className="body">
          <div className="lcol">

            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-lbl">Birmingham avg</div>
                <div className="stat-val">{avgNone}%</div>
                <div className="stat-sub">no qualifications</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Highest no-quals ward</div>
                <div className="stat-val txt">{sorted[0].ward_name}</div>
                <div className="stat-sub">{sorted[0].qual_none}% no qualifications</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Birmingham avg</div>
                <div className="stat-val">{avgL4}%</div>
                <div className="stat-sub">Level 4+ (degree)</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Skills decile 8–10</div>
                <div className="stat-val">{highDepriv}</div>
                <div className="stat-sub">most skills-deprived wards</div>
              </div>
            </div>

            {/* Breadcrumb + legend */}
            <div className="data-view-toolbar">
              <div className="breadcrumb">
                <a href="/" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', textDecoration: 'none' }}>← Ozzy</a>
                <span style={{ margin: '0 6px', color: 'var(--muted)' }}>/</span>
                <span>Education &amp; Skills</span>
              </div>
              <div className="legend-row">
                <span className="llbl" style={{ marginRight: 2 }}>Low</span>
                {['#7a8270','#7a7a5e','#7d6e4e','#7e5e40','#7d4e36','#73402e','#683428','#5b2a23','#4d211d','#3a1a1a'].map((c, i) => (
                  <div key={i} className="lsw" style={{ background: c }} />
                ))}
                <span className="llbl" style={{ marginLeft: 2 }}>High — % no quals</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="sub-tab-bar">
              {(['grid', 'table', 'chart'] as Sub[]).map(s => (
                <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>
                  {s === 'grid' ? 'Grid' : s === 'table' ? 'Table' : 'Distribution'}
                </button>
              ))}
            </div>

            {/* Panel */}
            <div className="panel" style={{ flex: 1, position: 'relative' }}>
              <div className="panel-body">
                {sub === 'grid'  && <QualGrid  wards={wards} selected={selected} onSelect={c => setSelected(wards.find(w => w.ward_code === c) ?? null)} />}
                {sub === 'table' && <QualTable wards={wards} selected={selected} onSelect={c => setSelected(wards.find(w => w.ward_code === c) ?? null)} />}
                {sub === 'chart' && (
                  <div style={{ padding: '18px 18px 0' }}>
                    <QualBars wards={wards} selected={selected} />
                  </div>
                )}
              </div>
              <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
            </div>

          </div>

          {/* Right panel */}
          <div className="rcol">
            {selected ? (
              <EduDetailPanel ward={selected} wards={wards} onClose={() => setSelected(null)} />
            ) : (
              <>
                <div className="r-empty">
                  <BullAscii
                    textColor="#15181e"
                    cols={40}
                    rows={26}
                    minAlpha={0.5}
                    displayWidth={110}
                    style={{ margin: 0 }}
                  />
                  <p>Select any ward to see its full qualification breakdown.</p>
                </div>

                {/* Prominent data sources section */}
                <div style={{ margin: '0 18px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ padding: '14px 0 8px', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>Data sources</div>
                  {SOURCES.map(s => (
                    <div key={s.name} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 5 }}>{s.desc}</div>
                      <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--mono)', fontSize: 9 }}>
                        <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: '#1a2a3a', textDecoration: 'underline' }}>
                          Dataset ↗
                        </a>
                        <a href={s.apiHref} target="_blank" rel="noopener noreferrer" style={{ color: '#1a2a3a', textDecoration: 'underline' }}>
                          API ↗
                        </a>
                        <span style={{ color: 'var(--muted2)' }}>{s.publisher} · {s.vintage}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 0', fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted2)', lineHeight: 1.6 }}>
                    All sources are publicly available. No API key required. Education data is a committed Census 2021 snapshot.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
