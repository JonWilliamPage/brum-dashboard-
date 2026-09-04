'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SiteFooter from '@/app/components/SiteFooter';
import BullAscii from '@/app/components/BullAscii';

const SC = '0123456789ABCDEFabcdef!@#$%^&*+-=<>|/\\{}[]?';

const QUESTIONS = [
  {
    id: 0,
    label: 'Unemployment',
    q: 'Which wards have the highest unemployment right now?',
    a: `Ladywood, Aston, Nechells, Bordesley & Highgate — these consistently top Birmingham's deprivation index. Ladywood sits at 11.1% claimant rate. Sutton Four Oaks is at 2.3%. That gap hasn't meaningfully closed in 18 months.\n\nThat's not a data quirk. That's a structural problem that keeps showing up month after month.`,
    links: [{ label: 'Employment dashboard →', href: '/dashboard' }],
    tag: 'Employment',
  },
  {
    id: 1,
    label: 'NEET & youth',
    q: "What's the NEET situation for young people in Birmingham?",
    a: `Birmingham's 16–17 NEET rate sits around 6.1% — above the England average. Nationally, 1.01 million young people are NEET as of Jan–Mar 2026 (13.5%). The Milburn review is ongoing.\n\nThe worst-affected wards cluster in the north and east of the city. Youth unemployment and economic inactivity are highest where educational attainment is also lowest — the same postcode, the same families, the same decade.`,
    links: [{ label: 'Youth & NEET dashboard →', href: '/dashboard' }],
    tag: 'Youth',
  },
  {
    id: 2,
    label: 'Education',
    q: 'Which areas have the worst education outcomes?',
    a: `Bordesley Green is at no-quals decile 9 — fourth year running. 35.8% of residents aged 16+ have no qualifications at all. The city average is 24.1%.\n\nAston and Lozells also rank poorly. This isn't a blip. It's structural. Targeted skills investment in the Aston–Nechells–Bordesley corridor has been the obvious call for years.`,
    links: [{ label: 'Education & Skills dashboard →', href: '/dashboard' }],
    tag: 'Education',
  },
  {
    id: 3,
    label: 'Crime',
    q: "How does crime vary across Birmingham's wards?",
    a: `City centre and Ladywood record the highest offence rates per 1,000 population — which is partly driven by footfall, not just deprivation. Outer wards like Sutton Four Oaks, Sutton Vesey, and Harborne sit well below the city average.\n\nWMP data is updated monthly. The choropleth map is the clearest way to see the pattern.`,
    links: [{ label: 'Crime dashboard →', href: '/dashboard' }],
    tag: 'Crime',
  },
  {
    id: 4,
    label: 'Economic output',
    q: "What does Birmingham's economic output look like by ward?",
    a: `City centre wards dominate GVA — Ladywood, which contains the CBD, generates by far the most. But strip out the commercial core and the picture changes. Residential wards like Edgbaston and Harborne carry their weight.\n\nThe Disadvantage quadrant — low GVA, high deprivation — is concentrated in the north and east. Those wards aren't just deprived, they're economically disconnected from the city they live in.`,
    links: [{ label: 'Economic Matrix →', href: '/dashboard' }],
    tag: 'Economy',
  },
  {
    id: 5,
    label: 'Data sources',
    q: 'What data does Ozzy actually use?',
    a: `Right now: NOMIS NM_162_1 for monthly claimant counts, IMD 2025 via Birmingham City Observatory, GVA 2022 via City Observatory, Census 2021 qualifications, WMP crime data, and ONS ward boundaries.\n\nAll public datasets. All updated as the sources publish. Modelled estimates — where real ward-level data doesn't exist — are clearly labelled throughout.`,
    links: [{ label: 'View all data sources →', href: '/sources' }],
    tag: 'Method',
  },
];

const TAG_COLOR: Record<string, string> = {
  Employment: 'var(--herald-blue)',
  Youth:      'var(--herald-navy)',
  Education:  '#2a6a4a',
  Crime:      'var(--herald-red)',
  Economy:    'var(--accent)',
  Method:     'var(--muted)',
};

interface ChatEntry {
  qId: number;
  ts: number;
  done: boolean;
}

function ScrambleBlock({ text, onDone }: { text: string; onDone: () => void }) {
  const [frame, setFrame] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const nonWhitespaceCount = text.replace(/\s/g, '').length;
  const totalFrames = Math.max(40, Math.ceil(nonWhitespaceCount / 5));

  useEffect(() => {
    let f = 0;
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      f++;
      if (f >= totalFrames) {
        clearInterval(id);
        setFrame(totalFrames);
        onDoneRef.current();
      } else {
        setFrame(f);
      }
    }, 25);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [totalFrames]);

  const done = frame >= totalFrames;

  const renderText = () => {
    const progress = frame / totalFrames;
    const resolvedCount = Math.floor(progress * text.length);

    const scrambled = text
      .split('')
      .map((ch, i) => {
        if (/\s/.test(ch)) return ch;
        if (i < resolvedCount) return ch;
        return SC[Math.floor(Math.random() * SC.length)];
      })
      .join('');

    return scrambled.split('\n\n').map((para, i, arr) => (
      <p
        key={i}
        style={{
          margin: 0,
          marginBottom: i < arr.length - 1 ? 14 : 0,
          fontFamily: 'var(--sans)',
          fontSize: 14,
          color: 'rgba(245,243,238,.88)',
          lineHeight: 1.75,
        }}
      >
        {para}
        {!done && i === arr.length - 1 && (
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 13,
            background: 'var(--herald-gold)',
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'ozzy-cursor-blink 0.7s step-end infinite',
          }} />
        )}
      </p>
    ));
  };

  return <>{renderText()}</>;
}

export default function OzzyPage() {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [askedIds, setAskedIds] = useState<Set<number>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleQuestion = useCallback((id: number) => {
    if (askedIds.has(id)) {
      entryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setAskedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setChatHistory(prev => [...prev, { qId: id, ts: Date.now(), done: false }]);
  }, [askedIds]);

  const handleDone = useCallback((ts: number) => {
    setChatHistory(prev => prev.map(e => e.ts === ts ? { ...e, done: true } : e));
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 80);
    }
  }, [chatHistory.length]);

  const allAsked = askedIds.size === QUESTIONS.length;

  return (
    <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <style>{`
        @keyframes ozzy-cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ozzy-entry-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .ozzy-q-btn {
          width:100%; text-align:left; padding:16px 18px;
          border:1px solid var(--border-solid);
          background:var(--surface); color:var(--ink);
          cursor:pointer; transition:all .15s;
        }
        .ozzy-q-btn:hover:not(.ozzy-q-asked) {
          border-color:var(--herald-navy);
          background:rgba(28,63,148,.04);
          box-shadow:inset 3px 0 0 var(--herald-gold);
        }
        .ozzy-q-btn.ozzy-q-asked {
          background:var(--herald-navy); color:#f5f3ee;
          border-color:var(--herald-navy);
          box-shadow:inset 3px 0 0 var(--herald-gold);
          cursor:pointer;
        }
        .ozzy-q-btn.ozzy-q-asked:hover { background:#162d6e; }
        .ozzy-q-tag {
          font-family:var(--sans); font-size:9px; font-weight:700;
          letter-spacing:.1em; text-transform:uppercase;
          padding:3px 8px; margin-bottom:7px; display:inline-block;
        }
        @media(max-width:700px){
          .ozzy-grid{ grid-template-columns:1fr !important; }
          .ozzy-sticky{ position:static !important; }
          .ozzy-q-cols{ grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* Hero strip */}
      <section style={{
        position: 'relative',
        background: 'var(--herald-navy)',
        padding: '56px 32px',
        overflow: 'hidden',
        borderBottom: '3px solid var(--herald-gold)',
      }}>
        <BullAscii
          animate={false}
          displayWidth={220}
          style={{
            position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', margin: 0,
            opacity: 0.07, pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.22em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
            Ask Ozzy
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 52, color: '#f5f3ee', lineHeight: 1.1, margin: '0 0 18px', fontWeight: 400, letterSpacing: '-.015em' }}>
            What do you want to know about Birmingham?
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'rgba(245,243,238,.75)', lineHeight: 1.65, maxWidth: 640, margin: 0 }}>
            Click a question. Ozzy decodes his answer live — backed by the city&apos;s public data. Every claim is traceable to a number you can check.
          </p>
          <div style={{ marginTop: 22, fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(245,243,238,.45)', fontStyle: 'italic' }}>
            Full agentic chat — where you type anything and Ozzy answers — is planned for a later release.{' '}
            <a href="/about" style={{ color: 'var(--herald-gold)', textDecoration: 'underline' }}>See the roadmap.</a>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section style={{ background: 'var(--paper)', padding: '52px 32px 80px', flex: 1 }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>

          {/* Two-col: questions left, chat right */}
          <div
            className="ozzy-grid"
            style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40, alignItems: 'start' }}
          >

            {/* Left: question buttons */}
            <div className="ozzy-sticky" style={{ position: 'sticky', top: 24 }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                {askedIds.size === 0 ? 'Choose a question' : `${askedIds.size} of ${QUESTIONS.length} asked`}
              </div>

              <div
                className="ozzy-q-cols"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
              >
                {QUESTIONS.map(item => {
                  const asked = askedIds.has(item.id);
                  const tagColor = TAG_COLOR[item.tag] ?? 'var(--muted)';
                  return (
                    <button
                      key={item.id}
                      className={`ozzy-q-btn${asked ? ' ozzy-q-asked' : ''}`}
                      onClick={() => handleQuestion(item.id)}
                      title={asked ? 'Scroll to answer ↓' : item.q}
                    >
                      <span
                        className="ozzy-q-tag"
                        style={{
                          color: asked ? 'var(--herald-gold)' : tagColor,
                          background: asked ? 'rgba(212,167,46,.12)' : `${tagColor}14`,
                        }}
                      >
                        {asked ? '✓ ' : ''}{item.tag}
                      </span>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.45, color: asked ? 'rgba(245,243,238,.85)' : 'var(--ink)' }}>
                        {item.q}
                      </div>
                    </button>
                  );
                })}
              </div>

              {allAsked && (
                <div style={{ marginTop: 14, padding: '12px 14px', border: '1px solid var(--border-solid)', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.65 }}>
                  All questions asked. Full AI chat is planned for a later release.
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-solid)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.8 }}>
                Data: NOMIS · IMD 2025 · Census 2021 · WMP · City Observatory
              </div>
            </div>

            {/* Right: chat */}
            <div ref={chatRef}>
              {chatHistory.length === 0 ? (
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24 }}>
                    ← Select a question to begin. Ozzy will decode his answer live.
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(14,15,17,0.07)', lineHeight: 1.4, whiteSpace: 'pre', userSelect: 'none' }}>
{`  ██████  ███████ ███████ ██    ██
 ██    ██    ███     ███   ██  ██
 ██    ██   ███     ███     ████
 ██    ██  ███     ███       ██
  ██████  ███████ ███████    ██`}
                  </div>
                  <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.2em', color: 'rgba(14,15,17,0.12)', textTransform: 'uppercase' }}>
                    BIRMINGHAM · FORWARD
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {chatHistory.map((entry, idx) => {
                    const item = QUESTIONS.find(q => q.id === entry.qId)!;
                    const tagColor = TAG_COLOR[item.tag] ?? 'var(--muted)';
                    return (
                      <div
                        key={entry.ts}
                        ref={el => { entryRefs.current[item.id] = el; }}
                        style={{
                          animation: 'ozzy-entry-in 0.3s ease',
                          paddingBottom: 36,
                          marginBottom: 36,
                          borderBottom: idx < chatHistory.length - 1 ? '1px solid var(--border-solid)' : 'none',
                        }}
                      >
                        {/* User question */}
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
                          <div style={{
                            flexShrink: 0, width: 32, height: 32,
                            background: 'var(--paper2)', border: '1px solid var(--border-solid)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: '.05em',
                          }}>
                            YOU
                          </div>
                          <div style={{ flex: 1, paddingTop: 6, fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', lineHeight: 1.4 }}>
                            {item.q}
                          </div>
                        </div>

                        {/* Ozzy response */}
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{
                            flexShrink: 0, width: 32, height: 32,
                            background: 'var(--herald-navy)', color: '#f5f3ee',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, lineHeight: 1,
                            position: 'relative',
                          }}>
                            O
                            <span style={{ position: 'absolute', inset: -3, border: '1px solid var(--herald-gold)', pointerEvents: 'none' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              position: 'relative',
                              background: 'var(--herald-navy)',
                              padding: '22px 24px',
                              marginBottom: 14,
                              overflow: 'hidden',
                            }}>
                              <BullAscii
                                animate={false}
                                displayWidth={110}
                                style={{
                                  position: 'absolute', bottom: -16, right: -16, margin: 0,
                                  opacity: 0.06, pointerEvents: 'none',
                                }}
                              />
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--herald-gold)', letterSpacing: '.14em', marginBottom: 14 }}>
                                  ━━ OZZY · BIRMINGHAM INTELLIGENCE
                                </div>
                                <ScrambleBlock
                                  text={item.a}
                                  onDone={() => handleDone(entry.ts)}
                                />
                              </div>
                            </div>

                            {/* Tag + links — appear after scramble */}
                            {entry.done && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', animation: 'ozzy-entry-in 0.25s ease' }}>
                                <span style={{
                                  fontFamily: 'var(--sans)', fontSize: 9, fontWeight: 700,
                                  letterSpacing: '.1em', textTransform: 'uppercase',
                                  color: tagColor, background: `${tagColor}14`,
                                  padding: '4px 9px',
                                }}>
                                  {item.tag}
                                </span>
                                {item.links.map(link => (
                                  <a key={link.href} href={link.href} style={{
                                    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
                                    padding: '8px 18px',
                                    border: '1px solid var(--herald-navy)',
                                    color: 'var(--herald-navy)',
                                    textDecoration: 'none', letterSpacing: '.03em',
                                    transition: 'all .15s',
                                  }}
                                  onMouseEnter={e => {
                                    const el = e.currentTarget;
                                    el.style.background = 'var(--herald-navy)';
                                    el.style.color = '#f5f3ee';
                                  }}
                                  onMouseLeave={e => {
                                    const el = e.currentTarget;
                                    el.style.background = 'transparent';
                                    el.style.color = 'var(--herald-navy)';
                                  }}
                                  >
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Suggest a question */}
          <div style={{
            marginTop: 52,
            padding: '22px 24px',
            background: 'var(--surface)',
            border: '1px solid var(--border-solid)',
            borderTopWidth: 3,
            borderTopColor: 'var(--herald-gold)',
            display: 'flex', gap: 20, alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
                A question Ozzy should answer?
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Tell us what matters to your ward, your team, or your work. We&apos;ll add it.
              </div>
            </div>
            <a href="mailto:westmidlands@lookingforgrowth.uk" style={{
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
              padding: '11px 22px',
              background: 'var(--herald-navy)', color: '#f5f3ee',
              textDecoration: 'none', letterSpacing: '.03em', whiteSpace: 'nowrap',
            }}>
              Suggest a question →
            </a>
          </div>

        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
