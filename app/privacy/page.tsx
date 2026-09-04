import type { Metadata } from 'next';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy · Ozzy',
  description: 'How Ask Ozzy handles your questions, your data, and what it stores.',
};

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Hero strip */}
      <section style={{ position: 'relative', background: 'var(--herald-navy)', padding: '52px 32px', overflow: 'hidden', borderBottom: '3px solid var(--herald-gold)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.22em', color: 'var(--herald-gold)', textTransform: 'uppercase', marginBottom: 14 }}>
            Privacy
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, color: '#f5f3ee', lineHeight: 1.1, margin: '0 0 14px', fontWeight: 400, letterSpacing: '-.015em' }}>
            What happens to your data.
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'rgba(245,243,238,.78)', lineHeight: 1.65, maxWidth: 640, margin: 0 }}>
            Ozzy is an independent, open-source project. This page explains, plainly, what we collect, what we send to third parties, and what stays on your own device.
          </p>
        </div>
      </section>

      {/* Body */}
      <section style={{ background: 'var(--paper)', padding: '56px 32px 80px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 10px', fontWeight: 400 }}>
              Ask Ozzy (the chat)
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 10px' }}>
              When you ask Ozzy a question, the text you type is sent to <strong style={{ color: 'var(--ink)' }}>Anthropic</strong> (maker of the Claude AI model) to generate a reply, along with relevant public dataset figures needed to answer it. We don&apos;t log, store, or review your questions on our own servers — the request passes straight through. See Anthropic&apos;s own privacy policy for how they handle API traffic: <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--herald-navy)' }}>anthropic.com/legal/privacy</a>.
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Please don&apos;t type personal, sensitive, or identifying information into the chat — Ozzy only needs civic questions about Birmingham to do its job.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 10px', fontWeight: 400 }}>
              What&apos;s stored, and where
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Your Ask Ozzy conversation history is saved only in your own browser&apos;s local storage — never on our servers, never shared. It stays on the device you used until you clear it (there&apos;s a &ldquo;Clear conversation&rdquo; link under the chat box) or clear your browser&apos;s site data. If you&apos;re on a shared or public computer, clear it when you&apos;re done.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 10px', fontWeight: 400 }}>
              Cookies &amp; tracking
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Ozzy doesn&apos;t use cookies, analytics, or any third-party tracking. Fonts are self-hosted rather than loaded from a third-party CDN, so no data about your visit is sent anywhere just to display the page.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 10px', fontWeight: 400 }}>
              The dashboard data
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Every figure on the dashboards is drawn from published, ward/area-aggregated official statistics (ONS, DWP, NOMIS, IMD, West Midlands Police, and others) — never individual-level records. Full source list and licensing: <a href="/sources" style={{ color: 'var(--herald-navy)' }}>Sources page</a>.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 10px', fontWeight: 400 }}>
              Questions
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Get in touch: <a href="mailto:westmidlands@lookingforgrowth.uk" style={{ color: 'var(--herald-navy)' }}>westmidlands@lookingforgrowth.uk</a>
            </p>
          </div>

        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
