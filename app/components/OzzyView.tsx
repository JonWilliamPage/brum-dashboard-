'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Ward, DataSources, NeetCityData } from '@/lib/types';
import BullAscii from './BullAscii';
import { renderOzzyContent, autoInjectMarkers } from './OzzyMarkers';

const SP = ['⠋', '⠙', '⠹', '⠸', '⼼', '⠴', '⠦', '⠧'];

const OZZY_SYSTEM = `You are Ozzy, the commentary voice for Ask Ozzy, an independent civic intelligence prototype for Birmingham. Work only from the selected data context supplied. Explain what it shows, why it might matter and what further evidence would be needed; do not claim comprehensive coverage or infer causes from patterns alone. Be informed, direct, locally grounded and clear about limitations.

PERSONALITY RULES
• Tone: Direct. Brummie-inflected but never a caricature. Plain English. Never academic. Never corporate.
• Every claim you make must be traceable to a specific number in the data context provided. If you don't have data for something, say so plainly — never speculate.
• No spin. No boosterism. No "Birmingham is on an exciting journey." If something has got worse, say so.
• Calls things what they are. "That's a 46% child poverty rate. That's not a statistic. That's nearly half the kids in this city."
• Politically neutral. You report what the data shows. No party allegiance. Don't name individual politicians.
• Your opinions are about conditions, not people.
• Crime totals are live data where available. Category breakdown, year-on-year change, and 12-month trend are modelled estimates — always flag them as such.

NAMED AFTER Ozzy Osbourne — working class, blunt, globally Brummie, not what the establishment expected.

INLINE VISUALS — emit these markers inside your answer where relevant (max 4 per response):
• {{ward:WardName}} — ward employment card. Use when discussing a specific ward's deprivation.
• {{crime:WardName}} — crime card for a ward. Use when discussing crime in a specific ward.
• {{crime-bars:WardName}} — 8-category crime chart. Use when asked for crime breakdown.
• {{stat:VALUE|LABEL}} — big stat callout. Use for a key headline number.
• {{list:top|N}} — top N most disadvantaged wards. Use for ranking/deprivation questions.
• {{list:top|N|crime}} — top N highest crime wards. Use for crime ranking questions.
• {{matrix:WardName}} — economic matrix. Use for quadrant/economic position questions.
• {{trend:WardName}} — 12-month claimant trend. Use when asked about trajectories.
• {{open:crime}} — CTA to open crime dashboard. Use at end of crime-focused answers.
• {{open:matrix}} — CTA to open economic matrix. Use at end of economic questions.
• {{neet-risk:WardName}} — NEET risk card for a ward. Use when discussing youth NEET risk, inactivity, or young people in a specific ward.

CRITICAL: Only make claims directly supported by the data provided below. If asked about something not in the data, say so. Cite specific ward names and numbers when you make a point.`;

const SUGGESTIONS = [
  'Which wards are improving and which are getting worse?',
  'What does compound disadvantage look like in Birmingham?',
  'Where is the gap between economic output and resident prosperity widest?',
  'How honest can you be about Birmingham right now?',
];

interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface BriefingData {
  headline: string;
  body: string[];
  quote: string;
  tags: { label: string; direction: 'up' | 'down' | 'flat' | 'warn' }[];
  signals: { label: string; value: string; sub: string; tone: 'red' | 'green' | 'amber' | 'blue' }[];
}

interface Props {
  wards: Ward[];
  dsrc: DataSources;
  neetData: NeetCityData;
  onAddHistory: (q: string) => void;
  onOpenView?: (v: string) => void;
}

const CONV_KEY = 'ozzy_conv_v2';

function buildNeetBlock(wards: Ward[], neetData: NeetCityData): string {
  const top10 = [...wards]
    .sort((a, b) => b.neet_risk_score - a.neet_risk_score)
    .slice(0, 10)
    .map(w => `  ${w.ward_name}: risk score ${w.neet_risk_score.toFixed(3)}, decile ${w.neet_risk_decile}/10, youth UC ${w.youth_claimant_rate}%, health inactivity ${w.inactivity_sick_pct}%`)
    .join('\n');

  return `
NEET CONTEXT — Young people (16–24) not in education, employment or training:
National (Jan–Mar 2026): 1,012,000 NEET, 13.5% rate — up 89,000 YoY, up 248,000 since 2021
Over 26% of NEET young people cite long-term sickness/disability (was 12% in 2013/14)
Milburn Review: government investigation launched Nov 2025, interim Spring 2026, final Summer 2026
Birmingham LA NEET (16–17 year olds, ${neetData.bham_year}): ${neetData.bham_neet_pct != null ? neetData.bham_neet_pct + '%' : 'est. 6–7%'} [${neetData.source}]
WMCA average NEET: ${neetData.wmca_neet_pct != null ? neetData.wmca_neet_pct + '%' : 'est. 5–6%'}
Birmingham risk factors: youngest major city (median age 33.7), 59/69 wards above-average school-aged children, 9 of top 10 child-population wards in IMD decile 1 — this is the NEET pipeline

Ward NEET risk index (modelled — youth UC claimant 50% + health inactivity 30% + IMD employment 20%; not an official rate):
${top10}`;
}

function buildDataBlock(wards: Ward[], dsrc: DataSources, neetData: NeetCityData): string {
  if (!wards.length) return '(no data loaded)';
  const sorted = [...wards].sort((a, b) => b.claimant_rate - a.claimant_rate);
  const avg = (wards.reduce((s, w) => s + w.claimant_rate, 0) / wards.length).toFixed(2);
  const avgIMD = (wards.reduce((s, w) => s + w.imd_employment_score, 0) / wards.length * 100).toFixed(1);
  const avgGva = (wards.reduce((s, w) => s + w.gva, 0) / wards.length).toFixed(1);
  const above9 = wards.filter(w => w.claimant_rate >= 9).length;
  const below3 = wards.filter(w => w.claimant_rate < 3).length;
  const decile10 = wards.filter(w => w.composite_decile === 10).map(w => w.ward_name);
  const decile1 = wards.filter(w => w.composite_decile === 1).map(w => w.ward_name);
  const quads: Record<string, number> = {};
  ['prosperous', 'workhorse', 'commuter', 'disadvantage'].forEach(q => {
    quads[q] = wards.filter(w => w.quadrant === q).length;
  });
  const gap = (sorted[0].claimant_rate - sorted[sorted.length - 1].claimant_rate).toFixed(1);
  const top5 = sorted.slice(0, 5).map(w => `${w.ward_name} ${w.claimant_rate}%`).join(', ');
  const bot5 = sorted.slice(-5).reverse().map(w => `${w.ward_name} ${w.claimant_rate}%`).join(', ');
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const summary = {
    wards: wards.length, city_avg_claimant: avg, city_avg_imd: avgIMD,
    city_avg_gva_per_head_k: avgGva, wards_above_9pct: above9, wards_below_3pct: below3,
    claimant_gap_pp: gap, decile_10_most_deprived: decile10, decile_1_least_deprived: decile1,
    economic_quadrants: quads, top_5_claimant: top5, bottom_5_claimant: bot5,
  };
  const live = Object.entries(dsrc).filter(([, v]) => v === 'live').map(([k]) => k);
  const cached = Object.entries(dsrc).filter(([, v]) => v === 'cached').map(([k]) => k);
  const caveats = [
    'Census 2021 ethnicity not refreshed until 2031 census',
    'Median earnings, youth unemployment, UC %, qualifications, vacancies are modelled estimates not ward-level real data',
    'Ward-level migration flow data does not exist in public sources — only LA-level',
    'Crime totals are live (WMP via City Observatory) where available; category breakdown, YoY change, and 12-month trend are modelled — always flag as modelled',
  ];

  return `BIRMINGHAM DATA CONTEXT — as of ${dateStr}\n\n` +
    `City-level summary:\n${JSON.stringify(summary, null, 2)}\n\n` +
    `Data source status:\n${JSON.stringify({ live, cached }, null, 2)}\n\n` +
    `Important caveats Ozzy must respect:\n${caveats.map(c => '• ' + c).join('\n')}\n\n` +
    `Full ward dataset (${wards.length} wards):\n${wards.map(w =>
      `${w.ward_name} (${w.ward_code}): claimant ${w.claimant_rate}%, youth claimant ${w.youth_claimant_rate}%, IMD employment ${(w.imd_employment_score * 100).toFixed(1)}%, inactivity-sick ${w.inactivity_sick_pct}%, GVA £${w.gva.toFixed(1)}k/head, composite decile ${w.composite_decile}/10, NEET risk decile ${w.neet_risk_decile}/10, quadrant: ${w.quadrant}, crime ${w.crime_rate_per_1000}/1000 (rank #${w.crime_rank})`
    ).join('\n')}` +
    buildNeetBlock(wards, neetData);
}

async function callOzzy(prompt: string, mode: 'ask' | 'briefing'): Promise<string> {
  const res = await fetch('/api/ozzy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode }),
  });
  const data = await res.json() as { content?: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'API error');
  return data.content!;
}

function todayKey() {
  return 'ozzy_brief_' + new Date().toISOString().slice(0, 10);
}

export default function OzzyView({ wards, dsrc, neetData, onAddHistory, onOpenView }: Props) {
  const [conv, setConv] = useState<ConvMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState('');
  const [briefingLoaded, setBriefingLoaded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [spinChar, setSpinChar] = useState('⠋');
  const spinIdx = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONV_KEY);
      if (saved) setConv(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveConv = (c: ConvMessage[]) => {
    try { localStorage.setItem(CONV_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  };

  const clearConv = () => {
    setConv([]);
    try { localStorage.removeItem(CONV_KEY); } catch { /* ignore */ }
  };

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.scrollTop = canvasRef.current.scrollHeight;
    });
  }, []);

  const submit = useCallback(async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || sending) return;
    setSending(true);
    setInput('');

    const userMsg: ConvMessage = { role: 'user', content: q, ts: Date.now() };
    const newConv = [...conv, userMsg];
    setConv(newConv);
    saveConv(newConv);
    onAddHistory(q);

    const si = setInterval(() => {
      setSpinChar(SP[spinIdx.current++ % SP.length]);
    }, 80);
    spinRef.current = si;
    scrollToBottom();

    try {
      const recent = newConv.slice(-8);
      const threadStr = recent.length > 1
        ? `\n\nCONVERSATION SO FAR (most recent last):\n${recent.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'You (Ozzy)'}: ${m.content}`).join('\n\n')}`
        : '';
      const dataBlock = buildDataBlock(wards, dsrc, neetData);
      const prompt = `${OZZY_SYSTEM}\n\n${dataBlock}${threadStr}\n\nUser asks: ${q}\n\nAnswer in 2-4 short paragraphs. Stay in Ozzy's voice. Cite specific ward names and numbers from the data above. If a follow-up references something earlier in the conversation, use that context. If you can't answer from the data, say "I haven't got data on that" and explain what data would be needed. Plain text, no markdown, no headings.`;

      const rawReply = await callOzzy(prompt, 'ask');
      const reply = autoInjectMarkers(q, rawReply);
      clearInterval(si);
      const replyMsg: ConvMessage = { role: 'assistant', content: reply, ts: Date.now() };
      const finalConv = [...newConv, replyMsg];
      setConv(finalConv);
      saveConv(finalConv);
      scrollToBottom();
    } catch (err: unknown) {
      clearInterval(si);
      const errMsg: ConvMessage = {
        role: 'assistant',
        content: `⚠ ${err instanceof Error ? err.message : 'Something went wrong'}`,
        ts: Date.now(),
      };
      const errConv = [...newConv, errMsg];
      setConv(errConv);
      saveConv(errConv);
    } finally {
      setSending(false);
    }
  }, [conv, input, sending, wards, dsrc, neetData, onAddHistory, scrollToBottom]);

  const loadBriefing = useCallback(async () => {
    if (briefingLoaded) return;
    setBriefingLoading(true);
    setBriefingError('');
    const si = setInterval(() => setSpinChar(SP[spinIdx.current++ % SP.length]), 80);
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        setBriefingData(JSON.parse(cached));
        setBriefingLoaded(true);
        return;
      }
      const liveCount = Object.values(dsrc).filter(v => v === 'live').length;
      const dataBlock = buildDataBlock(wards, dsrc, neetData);
      const highestNeetWard = [...wards].sort((a, b) => b.neet_risk_score - a.neet_risk_score)[0];
      const prompt = `${OZZY_SYSTEM}\n\n${dataBlock}\n\nGenerate today's Ozzy briefing. Respond ONLY with valid JSON, no markdown, no code fences, in this exact shape:\n\n{"headline":"Two sentences. The first is the news. The second is what it means. Specific, opinionated, grounded in numbers from the data above.","body":["First paragraph: the headline observation expanded with specific ward names and numbers.","Second paragraph: the structural context — what's been true for years that this fits into.","Third paragraph: what this means, in Ozzy's voice, with a specific local detail."],"quote":"One sentence Ozzy quote — the most direct, opinionated line of the briefing.","tags":[{"label":"Short topic phrase","direction":"up|down|flat|warn"}],"signals":[{"label":"Most pressing ward","value":"e.g. 11.1%","sub":"Ladywood claimants","tone":"red"},{"label":"City benchmark","value":"e.g. 6.8%","sub":"city avg","tone":"green"},{"label":"Structural gap","value":"e.g. 8.8pp","sub":"top to bottom","tone":"amber"},{"label":"NEET risk — highest ward","value":"${highestNeetWard?.ward_name ?? ''}","sub":"risk decile ${highestNeetWard?.neet_risk_decile ?? 10}/10 (modelled)","tone":"red"}]}\n\nDo not say "Birmingham is on a journey". Do not be polite about the gap. The opinion is the value.\n\n(${liveCount}/4 live data sources active)`;
      const raw = await callOzzy(prompt, 'briefing');
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned) as BriefingData;
      sessionStorage.setItem(todayKey(), JSON.stringify(parsed));
      setBriefingData(parsed);
      setBriefingLoaded(true);
    } catch (err: unknown) {
      setBriefingError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      clearInterval(si);
      setBriefingLoading(false);
    }
  }, [briefingLoaded, wards, dsrc, neetData]);

  const toggleBriefing = useCallback(async () => {
    const opening = !briefingOpen;
    setBriefingOpen(opening);
    if (opening && !briefingLoaded) await loadBriefing();
  }, [briefingOpen, briefingLoaded, loadBriefing]);

  const regenerateBriefing = async () => {
    sessionStorage.removeItem(todayKey());
    setBriefingLoaded(false);
    setBriefingData(null);
    setBriefingError('');
    setBriefingOpen(false);
    setTimeout(() => { setBriefingOpen(true); loadBriefing(); }, 50);
  };

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const todayShort = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const tagTone: Record<string, React.CSSProperties> = {
    up: { color: 'var(--q-prosp)', borderColor: 'var(--q-prosp)', background: 'rgba(26,58,42,.06)' },
    down: { color: 'var(--q-disad)', borderColor: 'var(--q-disad)', background: 'rgba(58,26,26,.06)' },
    flat: { color: 'var(--muted)', borderColor: 'var(--border2)', background: 'var(--paper2)' },
    warn: { color: '#7d4e36', borderColor: '#7d4e36', background: 'rgba(125,78,54,.06)' },
  };
  const sigTone: Record<string, React.CSSProperties> = {
    red: { color: 'var(--q-disad)' },
    green: { color: 'var(--q-prosp)' },
    amber: { color: '#7d4e36' },
    blue: { color: 'var(--q-comm)' },
  };

  return (
    <div className="ozzy-canvas" ref={canvasRef}>
      <div className="ozzy-canvas-inner">

        {/* Hero + input */}
        <div className="ozzy-hero">
          <BullAscii />
          <h1 className="ozzy-hero-ttl">Ask Ozzy</h1>
          <p className="ozzy-hero-sub">Birmingham&apos;s data voice. Direct, opinionated, grounded in every public number about the city.</p>
          <div className="ozzy-input-wrap">
            <input
              className="ozzy-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="Ask anything about Birmingham…"
              autoComplete="off"
            />
            <button className="ozzy-send" disabled={sending || !input.trim()} onClick={() => submit()}>
              {sending ? <>{spinChar} thinking</> : <>Ask Ozzy ↗</>}
            </button>
          </div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
            Questions are sent to Anthropic&apos;s Claude AI to generate answers — don&apos;t enter personal or sensitive information. Your conversation is saved only in this browser, not on our servers. <a href="/privacy" style={{ color: 'var(--herald-navy)' }}>Privacy details</a>.{' '}
            {conv.length > 0 && <button onClick={clearConv} style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--herald-navy)', textDecoration: 'underline', textUnderlineOffset: 2, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Clear conversation</button>}
          </p>
          {conv.length === 0 && (
            <div className="ozzy-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="ozzy-sugg" onClick={() => submit(s)}>
                  <span className="ozzy-sugg-glyph">·</span>{s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation — reverse-pair layout: newest at top */}
        {(conv.length > 0 || sending) && (
          <div className="ozzy-conv">
            {/* Pending spinner at top when sending */}
            {sending && (
              <div className="conv-pair">
                <div className="msg msg-ozzy">
                  <div className="msg-av">O</div>
                  <div className="msg-content msg-thinking">{spinChar} Ozzy is checking the numbers…</div>
                </div>
                {conv.length > 0 && conv[conv.length - 1].role === 'user' && (
                  <div className="msg msg-user">
                    <div className="msg-av">YOU</div>
                    <div className="msg-content">{conv[conv.length - 1].content}</div>
                  </div>
                )}
              </div>
            )}
            {/* Render pairs in reverse order (newest first) */}
            {(() => {
              const pairs: { user: ConvMessage; assistant: ConvMessage }[] = [];
              const msgs = sending ? conv.slice(0, -1) : conv;
              for (let i = msgs.length - 1; i >= 0; i -= 2) {
                const assistant = msgs[i];
                const user = msgs[i - 1];
                if (assistant?.role === 'assistant' && user?.role === 'user') {
                  pairs.push({ user, assistant });
                }
              }
              return pairs.map((pair, pi) => (
                <div key={pi} className="conv-pair">
                  <div className="msg msg-ozzy">
                    <div className="msg-av">O</div>
                    <div className="msg-content">
                      {renderOzzyContent(pair.assistant.content, wards, { onOpenView })}
                    </div>
                  </div>
                  <div className="msg msg-user">
                    <div className="msg-av">YOU</div>
                    <div className="msg-content">{pair.user.content}</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* Briefing */}
        <div className="ozzy-briefing-wrap">
          <button
            className={`briefing-toggle${briefingOpen ? ' open' : ''}`}
            onClick={toggleBriefing}
          >
            <div className="briefing-toggle-text">
              <div className="briefing-toggle-eyebrow">Daily briefing · {todayShort}</div>
              <div className="briefing-toggle-title">See what Ozzy thinks about Birmingham today</div>
            </div>
            <span className="briefing-toggle-chev">▾</span>
          </button>

          {briefingOpen && (
            <div className="briefing-body">
              {briefingLoading && (
                <div className="brf-loading">
                  <div className="brf-loading-spin">{spinChar}</div>
                  <div className="brf-loading-txt">Ozzy is reading the data…</div>
                  <div className="brf-loading-sub">{wards.length} wards · synthesising</div>
                </div>
              )}
              {briefingError && (
                <div className="brf-err">
                  ⚠ Ozzy can&apos;t synthesise a briefing right now ({briefingError}). The data layer is still working — try asking a direct question above.
                </div>
              )}
              {briefingData && !briefingLoading && (
                <>
                  <div className="brf-date">{dateStr}</div>
                  <h2 className="brf-headline">{briefingData.headline}</h2>
                  <div className="brf-signals">
                    {(briefingData.signals ?? []).map((s, i) => (
                      <div key={i} className="brf-sig">
                        <div className="brf-sig-lbl">{s.label}</div>
                        <div className="brf-sig-val" style={sigTone[s.tone] ?? {}}>{s.value}</div>
                        <div className="brf-sig-sub">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="brf-body">
                    {(briefingData.body ?? []).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                  <div className="brf-quote">
                    {briefingData.quote}
                    <span className="brf-quote-att">— Ozzy</span>
                  </div>
                  <div className="brf-tags">
                    {(briefingData.tags ?? []).map((t, i) => (
                      <span key={i} className="brf-tag" style={tagTone[t.direction] ?? tagTone.flat}>
                        {t.label}{t.direction === 'up' ? ' ↑' : t.direction === 'down' ? ' ↓' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="brf-foot">
                    Generated from live ward data · every claim traceable to a number above.
                    <button onClick={regenerateBriefing}>↻ regenerate</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
