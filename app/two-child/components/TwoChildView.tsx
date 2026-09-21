'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { TwoChildData } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import FocusableChart from '../../components/FocusableChart';

const TwoChildMap = dynamic(() => import('./TwoChildMap'), { ssr: false });

// Two-Child Limit — what abolition (6 April 2026) means for Birmingham, from DWP's
// FINAL statistical release. Constituency level — no ward breakdown exists; the banner
// says so plainly. "Children not receiving a child element" is DWP's own measure:
// third or subsequent children who attracted no child element while the policy ran.
type Sub = 'bars' | 'table' | 'map';

const NAVY = '#16306f';
const RED = '#b01225';

export default function TwoChildView({ data }: { data: TwoChildData }) {
  const [sub, setSub] = useState<Sub>('bars');
  const cons = data.constituencies ?? [];
  const max = Math.max(...cons.map(c => c.households_affected), 1);
  const short = (n: string) => n.replace('Birmingham ', '');

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ CONSTITUENCY FIGURE — POLICY ABOLISHED 6 APRIL 2026</span>
          <p>
            DWP&apos;s <strong>final</strong> two-child limit statistics (April 2026, UC admin data).
            DWP publishes these for <strong>parliamentary constituencies only — no ward-level breakdown
            exists</strong>, so a 69-ward view of this dataset cannot be built without inventing numbers.
            The £ figures are <strong>derived</strong>: children not receiving a child element × the
            official rate (£{data.child_element_month}/child/month). The separate benefit cap means some
            households will not see the full gain. Hodge Hill &amp; Solihull North straddles the Solihull border.
          </p>
        </div>

        <div className="sub-tab-bar">
          {([['bars', 'Ranked'], ['table', 'Table'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        {sub === 'map' && (
          <div className="data-view-toolbar">
            <div className="legend-row">
              <span className="llbl" style={{ marginRight: 2 }}>Fewer</span>
              {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
              <span className="llbl" style={{ marginLeft: 2 }}>More households affected</span>
              <span className="llbl" style={{ marginLeft: 12, color: 'var(--herald-red)' }}>▬ hardest-hit</span>
            </div>
          </div>
        )}

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={sub === 'map' ? undefined : { padding: '16px 18px' }}>
            {sub === 'bars' && (
              <>
                <div className="bill-sec-ttl">Households that were affected, by constituency (April 2026)</div>
                {cons.map(c => (
                  <div key={c.name} className="hb-row" style={{ padding: '6px 0' }}>
                    <div className="hb-name" style={{ fontSize: 14 }}>
                      {short(c.name)}
                      <span className="hb-you" style={{ color: 'var(--muted2)', textTransform: 'none', letterSpacing: 0 }}>
                        {c.children_affected?.toLocaleString()} children not receiving an element
                      </span>
                    </div>
                    <div className="hb-track">
                      <div className="hb-bar" style={{ width: `${(c.households_affected / max) * 100}%`, background: c === cons[0] ? RED : NAVY }} />
                      <span className="hb-val">{c.households_affected.toLocaleString()} hh · +£{c.derived_annual_gain_m}m/yr</span>
                    </div>
                  </div>
                ))}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.6 }}>
                  hh = households. £/yr derived: children not receiving an element × £{data.child_element_month} × 12 —
                  the child element is now paid for every child. Red = highest in the city.
                </div>
              </>
            )}
            {sub === 'table' && (
              <FocusableChart title="Two-Child Limit Table">
              <div className="crime-table-wrap" style={{ margin: '-16px -18px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Constituency</th>
                      <th>Households affected</th>
                      <th>Children not receiving an element</th>
                      <th>Households now gaining</th>
                      <th>Derived gain / yr</th>
                      <th>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cons.map(c => (
                      <tr key={c.name}>
                        <td className="td-ward" style={{ fontFamily: 'var(--sans)', fontWeight: 500 }}>{short(c.name)}</td>
                        <td style={{ fontWeight: 500, color: c === cons[0] ? 'var(--herald-red)' : 'var(--ink)' }}>{c.households_affected.toLocaleString()}</td>
                        <td>{c.children_affected?.toLocaleString() ?? '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{c.households_gaining?.toLocaleString() ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>+£{c.derived_annual_gain_m}m</td>
                        <td>
                          <div className="mini-bar-bg">
                            <div className="mini-bar-fill" style={{ width: `${(c.households_affected / max) * 100}%`, background: c === cons[0] ? RED : NAVY }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </FocusableChart>
            )}
            {sub === 'map' && (
              <FocusableChart title="Two-Child Limit Map">
                <TwoChildMap constituencies={cons} />
              </FocusableChart>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">+£{data.city.derived_annual_gain_m}m</div>
          <div className="hb-big-sub">derived extra UC flowing into Birmingham each year now the two-child limit is gone</div>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Households affected (Apr 2026)</span>
              <span className="hb-fact-v">{data.city.households_affected.toLocaleString()} — the hardest-hit big city</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Children in those households</span>
              <span className="hb-fact-v">{data.city.children_in_households.toLocaleString()}</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Children not receiving an element</span>
              <span className="hb-fact-v">{data.city.children_affected.toLocaleString()} (DWP&apos;s &ldquo;children affected&rdquo;)</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Households now gaining</span>
              <span className="hb-fact-v">{data.city.households_gaining.toLocaleString()} ({data.city.children_in_gaining.toLocaleString()} children)</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Constituency — DWP publishes no ward data</span>
            </div>
          </div>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Source</div>
            {(data.sources ?? []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">{s.label}</a>
                <span className="hb-src-meta">{s.publisher} · {s.licence} · {s.as_of}</span>
              </div>
            ))}
            <a href="/sources" className="hb-sources-all">All sources &amp; methods →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
