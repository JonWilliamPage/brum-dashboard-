'use client';

import { useState, useEffect } from 'react';
import BullAscii from '@/app/components/BullAscii';
import DashboardCards from '@/app/components/DashboardCards';
import SiteFooter from '@/app/components/SiteFooter';

const ROADMAP = [
  { status: 'live',    label: 'Employment & claimants',   detail: 'IMD employment domain, claimant count and Universal Credit by ward' },
  { status: 'live',    label: 'Crime by ward',            detail: 'West Midlands Police recorded offences — rates, trends and category mix' },
  { status: 'live',    label: 'Education & skills',       detail: 'Census 2021 qualifications + IMD education domain' },
  { status: 'live',    label: 'Youth & NEET risk',        detail: 'Composite picture of the 16–24 cohort across 69 wards' },
  { status: 'live',    label: 'Economic matrix',          detail: 'GVA per head against deprivation — the city in four quadrants' },
  { status: 'live',    label: 'The Benefits Bill',        detail: 'DWP expenditure in Birmingham — history, composition and per head' },
  { status: 'live',    label: 'Money Map & PIP',          detail: 'DWP £ by constituency, PIP place and condition, child poverty and more' },
  { status: 'soon',    label: 'Tax & local finance',      detail: 'Council budget, tax and service outturn — separate from the DWP benefits bill' },
  { status: 'soon',    label: 'UC payment intensity',     detail: 'Household award bands and means from Stat-Xplore for Birmingham' },
  { status: 'soon',    label: 'Care & demand pressure',   detail: 'Children’s social care and related outturn — peers and trajectories' },
  { status: 'planned', label: 'Full agentic chat',        detail: 'Ask Ozzy anything. Get a data-backed answer from the evidence base.' },
  { status: 'planned', label: 'Ozzy daily newsletter',    detail: 'Automated briefing — subscribe by ward, city-wide or theme' },
];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  live:    { label: 'Live',    color: 'var(--herald-navy)',  bg: 'rgba(28,63,148,.1)',  border: 'var(--herald-gold)' },
  soon:    { label: 'Soon',    color: 'var(--herald-blue)',  bg: 'rgba(28,63,148,.06)', border: 'var(--herald-blue)' },
  planned: { label: 'Planned', color: 'var(--muted)',        bg: 'rgba(107,103,96,.08)', border: 'var(--border-solid)' },
};

type Stat = { val: string; lbl: string; note?: string; link?: { href: string; text: string } };

const STATS: Stat[] = [
  { val: '20+', lbl: 'official sources connected' },
  { val: '69',  lbl: 'Birmingham wards' },
  { val: '19',  lbl: 'data views in the pipeline' },
  { val: '5',   lbl: 'contributors', link: { href: '#contribute', text: 'Become a contributor →' } },
];

export default function AboutPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number): React.CSSProperties => ({
    opacity: ready ? 1 : 0,
    transform: ready ? 'none' : 'translateY(14px)',
    transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
  });

  return (
    <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* HERO — navy field, BullAscii, coat of arms watermark */}
      <section style={{
        position: 'relative',
        background: 'var(--herald-navy)',
        padding: '72px 32px 80px',
        textAlign: 'center',
        overflow: 'hidden',
        borderBottom: '3px solid var(--herald-gold)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/birmingham-coat-of-arms.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: -20, right: -64,
            width: 460, opacity: 0.06, pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '0 auto' }}>
          <div style={{ ...fade(0), marginBottom: 8 }}>
            <BullAscii />
          </div>

          <div style={{ ...fade(120), fontFamily: 'var(--serif)', fontSize: 96, lineHeight: .95, color: '#f5f3ee', letterSpacing: '-.025em', marginTop: 18 }}>
            Ozzy
          </div>

          <div style={{ ...fade(200), fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.24em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginTop: 14 }}>
            Birmingham&apos;s AI agent
          </div>

          <div style={{ ...fade(360), marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <a href="/dashboard" style={{
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
              padding: '12px 26px',
              background: 'var(--herald-gold)', color: 'var(--herald-navy)',
              textDecoration: 'none', letterSpacing: '.04em',
            }}>
              View dashboards →
            </a>
          </div>

          {/* Stats strip */}
          <div style={{ ...fade(480), marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxWidth: 760, marginInline: 'auto' }}>
            {STATS.map(s => (
              <div key={s.lbl} style={{
                borderTop: '2px solid var(--herald-gold)',
                padding: '14px 8px 4px',
              }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1, color: '#f5f3ee', letterSpacing: '-.02em' }}>
                  {s.val}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'rgba(245,243,238,.6)', marginTop: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {s.lbl}
                </div>
                {s.note && (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'rgba(239,183,0,.8)', marginTop: 4 }}>
                    {s.note}
                  </div>
                )}
                {s.link && (
                  <a href={s.link.href} style={{
                    display: 'inline-block', marginTop: 6,
                    fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600,
                    color: 'var(--herald-gold)', letterSpacing: '.04em',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                  }}>
                    {s.link.text}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS OZZY — full width */}
      <section style={{ background: 'var(--paper)', padding: '88px 32px 72px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 18 }}>
            What is Ozzy?
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 50, color: 'var(--ink)', lineHeight: 1.12, margin: '0 0 24px', fontWeight: 400, letterSpacing: '-.01em' }}>
            An AI agent that wants to save Birmingham.
          </h2>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 18px' }}>
            Ozzy is an open-source project with one purpose: to read every publicly available dataset about Birmingham and tell the city the truth about itself. Birmingham City Council releases and the City Observatory, the Office for National Statistics, the Department for Work and Pensions — including Stat-Xplore and published expenditure tables — HM Revenue and Customs, West Midlands Police, and the Home Office&apos;s data.police.uk. He reads them all. He cross-references them. And then he presents what they actually say.
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 18px' }}>
            There are <strong style={{ color: 'var(--ink)' }}>thousands of data points</strong> about this city in the public domain. Some are quietly published. Some are released in a way that obscures the reality. Some are buried under jargon. Ozzy&apos;s job is to cut through all that and make the truth easy to see.
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 24px' }}>
            And it&apos;s built in the open, with AI, by people who care about this city. The more Brummies who bring datasets, questions and build effort, the more Ozzy can see. This is a tool for the whole city to build together.
          </p>
          <a href="#contribute" style={{
            display: 'inline-block',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
            padding: '12px 26px',
            background: 'var(--herald-navy)', color: '#f5f3ee',
            textDecoration: 'none', letterSpacing: '.04em',
          }}>
            Contribute →
          </a>
        </div>
      </section>

      {/* DANCETTY DIVIDER */}
      <div style={{
        height: 8,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='8'%3E%3Cpath d='M0 6 L14 2 L28 6' fill='none' stroke='%23efb700' stroke-width='2'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: '28px 8px',
        opacity: 0.8,
      }} />

      {/* WHAT'S LIVE */}
      <section style={{ background: 'var(--surface)', padding: '80px 32px 80px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
              What&apos;s live
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 14px', fontWeight: 400, letterSpacing: '-.01em' }}>
              Birmingham in data — so far.
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 640, marginInline: 'auto' }}>
              Every view is built on official sources, ward by ward where the data allows. From Universal Credit and the Benefits Bill to crime, skills and child poverty — the evidence behind Ozzy.
            </p>
          </div>

          <DashboardCards />

          <div style={{ marginTop: 36, textAlign: 'center' }}>
            <a href="/dashboard" style={{
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
              padding: '12px 28px',
              background: 'var(--herald-navy)', color: '#f5f3ee',
              textDecoration: 'none', letterSpacing: '.04em',
            }}>
              Open the full dashboard suite →
            </a>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE / CONTRIBUTE */}
      <section id="contribute" style={{
        scrollMarginTop: 80,
        background: 'var(--surface)',
        padding: '88px 32px 88px',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid var(--border)',
        borderBottom: '3px solid var(--herald-gold)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/birmingham-coat-of-arms.png" alt="" aria-hidden="true" style={{
          position: 'absolute', top: '50%', right: -60, transform: 'translateY(-50%)',
          width: 380, opacity: 0.04, pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 64, alignItems: 'start' }} className="about-two-col">
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                Open source · For Birmingham
              </div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 42, color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 22px', fontWeight: 400, letterSpacing: '-.01em' }}>
                Every line of code. Every dataset. Every methodology. <em>Public.</em>
              </h2>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 18px' }}>
                Ozzy is built in the open. The code is on GitHub. The data sources are listed. The way Ozzy reaches every conclusion is traceable, end to end.
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 24px' }}>
                We need <strong style={{ color: 'var(--ink)' }}>Brummies</strong> to help build this. You don&apos;t need a traditional coding background. You just need to know the city, know a dataset, or be willing to build with AI.
              </p>

              <div style={{
                background: 'var(--surface)',
                borderTop: '3px solid var(--herald-gold)',
                border: '1px solid var(--border-solid)',
                borderTopWidth: 3,
                borderTopColor: 'var(--herald-gold)',
                padding: '22px 24px',
                marginBottom: 18,
              }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, color: 'var(--herald-gold)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Join the team
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 14, lineHeight: 1.3 }}>
                  Email us and you&apos;re added.
                </div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 18px' }}>
                  No interview. No application. No technical bar. If you care about Birmingham and you want the truth told, we want you on the team.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href="mailto:westmidlands@lookingforgrowth.uk" style={{
                    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                    padding: '11px 22px',
                    background: 'var(--herald-navy)', color: '#f5f3ee',
                    textDecoration: 'none', letterSpacing: '.03em',
                  }}>
                    westmidlands@lookingforgrowth.uk →
                  </a>
                  <a href="https://github.com/willspensley/brum-dashboard-" target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                    padding: '11px 22px',
                    border: '1px solid var(--herald-navy)', color: 'var(--herald-navy)',
                    textDecoration: 'none', letterSpacing: '.03em',
                  }}>
                    GitHub ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Three contribute lanes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  glyph: '◈',
                  ttl: 'Know a dataset?',
                  body: 'Public dataset we&apos;re not using? Benefits, tax, housing, health, schools, transport, environment. If it&apos;s public and it tells Birmingham&apos;s story, it belongs here.',
                  who: 'Council officers · researchers · journalists · curious residents',
                },
                {
                  glyph: '▦',
                  ttl: 'Can you help us build?',
                  body: 'You don&apos;t need to be a traditional developer. If you can build with AI — or you&apos;re willing to learn by shipping — help us add a view, wire a dataset, or improve what already exists. Pull requests and prototypes both welcome.',
                  who: 'Anyone who can ship · Brum tech scene · students · AI builders',
                },
                {
                  glyph: '◉',
                  ttl: 'Got a question worth asking?',
                  body: 'Policy officer? Analyst? Community organiser? Tell us which questions matter most for your ward or your work. Shape what Ozzy focuses on.',
                  who: 'No technical skill required',
                },
              ].map(c => (
                <div key={c.ttl} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-solid)',
                  padding: '20px 22px',
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr',
                  gap: 18,
                  alignItems: 'start',
                }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 26,
                    color: 'var(--herald-navy)',
                    background: 'rgba(28,63,148,.08)',
                    width: 48, height: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.glyph}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>{c.ttl}</div>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 10px' }} dangerouslySetInnerHTML={{ __html: c.body }} />
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--herald-gold)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      For: {c.who}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section style={{ background: 'var(--paper)', padding: '80px 32px 80px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
              What&apos;s in Ozzy
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.2, margin: '0 0 12px', fontWeight: 400, letterSpacing: '-.01em' }}>
              This is the start — not the finished city.
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 620 }}>
              What Ozzy can see today, what we&apos;re opening next — including tax and local finance as its own chapter — and the long-term agent vision. Want to push one of these up the list? <a href="mailto:westmidlands@lookingforgrowth.uk" style={{ color: 'var(--herald-navy)', textDecoration: 'underline', textDecorationColor: 'var(--herald-gold)' }}>Tell us.</a>
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="about-two-col">
            {ROADMAP.map(r => {
              const s = STATUS_STYLE[r.status];
              return (
                <div key={r.label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '16px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-solid)',
                  borderLeft: `3px solid ${s.border}`,
                }}>
                  <span style={{
                    fontSize: 9, fontFamily: 'var(--sans)', fontWeight: 700,
                    padding: '4px 9px',
                    color: s.color, background: s.bg,
                    whiteSpace: 'nowrap', marginTop: 2,
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}>
                    {s.label}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{r.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />

      <style jsx>{`
        @media (max-width: 880px) {
          .about-two-col {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
