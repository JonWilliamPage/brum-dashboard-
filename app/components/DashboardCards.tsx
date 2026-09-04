'use client';

const DASHBOARDS = [
  {
    key: 'employment',
    name: 'Employment & claimants',
    sub: 'IMD · claimant count · 68 wards',
    finding: 'Where worklessness sits — and how wide the gap still is',
    glyph: '▦',
    color: 'var(--herald-blue)',
    pattern: 'lozenge',
  },
  {
    key: 'uc',
    name: 'Universal Credit',
    sub: 'DWP · ward caseload · in-work share',
    finding: 'Who is on UC, who is also in paid work, and where pressure concentrates',
    glyph: '◈',
    color: 'var(--herald-navy)',
    pattern: 'ermine',
  },
  {
    key: 'bill',
    name: 'The Benefits Bill',
    sub: 'DWP expenditure · Birmingham LA · history',
    finding: 'What central government spends here — then vs now, real and per head',
    glyph: '£',
    color: '#2a6a4a',
    pattern: 'dancetty',
  },
  {
    key: 'money-map',
    name: 'Constituency Money Map',
    sub: 'DWP £ · nine Birmingham constituencies',
    finding: 'Where the bill lands by parliamentary seat — accounts, not estimates',
    glyph: '◆',
    color: 'var(--accent)',
    pattern: 'lozenge',
  },
  {
    key: 'pip',
    name: 'PIP & disability support',
    sub: 'Caseload by place · GB condition mix · city £',
    finding: 'Personal Independence Payment as lived caseload and national condition story',
    glyph: '◎',
    color: 'var(--herald-blue)',
    pattern: 'ermine',
  },
  {
    key: 'child-poverty',
    name: 'Child poverty',
    sub: 'Absolute low income · 0–15 · ward series',
    finding: 'Which wards carry the highest share of children in low-income families',
    glyph: '◑',
    color: 'var(--herald-navy)',
    pattern: 'dancetty',
  },
  {
    key: 'crime',
    name: 'Crime',
    sub: 'West Midlands Police · rates & deep dive',
    finding: 'Recorded offences per 1,000 — trends, categories and outcomes',
    glyph: '⚠',
    color: 'var(--herald-red)',
    pattern: 'dancetty',
  },
  {
    key: 'education',
    name: 'Education & skills',
    sub: 'Census 2021 quals · IMD education domain',
    finding: 'No-qualifications concentrations and the skills map of the city',
    glyph: '◈',
    color: '#2a6a4a',
    pattern: 'ermine',
  },
  {
    key: 'youth',
    name: 'Youth & NEET risk',
    sub: '16–24 cohort · 68 wards',
    finding: 'Where young people are most exposed to being left behind',
    glyph: '◑',
    color: 'var(--herald-navy)',
    pattern: 'lozenge',
  },
  {
    key: 'matrix',
    name: 'Economic matrix',
    sub: 'GVA per head × deprivation',
    finding: 'Advantage and disadvantage — the city in four quadrants',
    glyph: '◆',
    color: 'var(--accent)',
    pattern: 'dancetty',
  },
];

function CardPattern({ kind, color }: { kind: string; color: string }) {
  if (kind === 'lozenge') {
    return (
      <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <pattern id={`p-loz-${color}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill={color} opacity="0.85" />
            <path d="M11 1 L21 11 L11 21 L1 11 Z" fill="var(--herald-gold)" />
          </pattern>
        </defs>
        <rect width="200" height="48" fill={`url(#p-loz-${color})`} />
      </svg>
    );
  }
  if (kind === 'dancetty') {
    return (
      <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: 'block', background: color }}>
        <path d="M0 30 L20 18 L40 30 L60 18 L80 30 L100 18 L120 30 L140 18 L160 30 L180 18 L200 30"
              fill="none" stroke="var(--herald-gold)" strokeWidth="2.5" />
        <path d="M0 42 L20 30 L40 42 L60 30 L80 42 L100 30 L120 42 L140 30 L160 42 L180 30 L200 42"
              fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'ermine') {
    return (
      <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: 'block', background: color }}>
        <g fill="var(--herald-gold)" opacity="0.75">
          {[20, 60, 100, 140, 180].map((x, i) => (
            <g key={i} transform={`translate(${x}, ${i % 2 === 0 ? 16 : 30})`}>
              <path d="M0 0 C -1 4 -3 6 -5 13 C -2 11 -1 11 0 11 C 1 11 2 11 5 13 C 3 6 1 4 0 0 Z" />
              <circle cx="0" cy="-3" r="1.1" />
              <circle cx="-3" cy="1" r="1.1" />
              <circle cx="3" cy="1" r="1.1" />
            </g>
          ))}
        </g>
      </svg>
    );
  }
  return null;
}

export default function DashboardCards() {
  return (
    <div className="dash-cards-grid">
      {DASHBOARDS.map(d => (
        <a key={d.key} href="/dashboard" className="dash-card" style={{ ['--dash-card-color' as string]: d.color }}>
          <div className="dash-card-pattern">
            <CardPattern kind={d.pattern} color={d.color} />
          </div>
          <div className="dash-card-body">
            <div className="dash-card-head">
              <span className="dash-card-glyph" style={{ color: d.color }}>{d.glyph}</span>
              <span className="dash-card-status">Live</span>
            </div>
            <div className="dash-card-name">{d.name}</div>
            <div className="dash-card-sub">{d.sub}</div>
            <div className="dash-card-finding">{d.finding}</div>
            <div className="dash-card-cta">Open dashboard →</div>
          </div>
        </a>
      ))}
    </div>
  );
}
