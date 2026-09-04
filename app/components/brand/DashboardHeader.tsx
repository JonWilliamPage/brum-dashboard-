import type { CSSProperties, ReactNode } from 'react';
import BullAscii from '../BullAscii';
import CrestWatermark from './CrestWatermark';

interface DashboardHeaderProps {
  /** Gold uppercase mono kicker, e.g. "BIRMINGHAM · FISCAL BALANCE". */
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Brand motif on the right. 'bull' renders a small static ASCII bull. */
  motif?: 'bull' | 'none';
  style?: CSSProperties;
}

/**
 * Editorial dashboard header — the Birmingham brand signature at the top of a
 * dashboard: gold eyebrow, serif headline, FORWARD motto, faded crest watermark,
 * and a small ASCII bull motif. Reusable across every dashboard.
 */
export default function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  motif = 'bull',
  style,
}: DashboardHeaderProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)',
        borderBottom: '3px solid var(--herald-gold)',
        padding: '22px 24px 20px',
        ...style,
      }}
    >
      <CrestWatermark
        width={260}
        opacity={0.05}
        textColor="#15181e"
        style={{ top: '50%', right: -36, transform: 'translateY(-50%)' }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--herald-gold)', marginBottom: 8 }}>
            {eyebrow}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1, margin: 0, letterSpacing: '-.01em' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </div>
        {motif === 'bull' && (
          <BullAscii
            animate={false}
            textColor="#15181e"
            cols={40}
            rows={26}
            minAlpha={0.5}
            displayWidth={72}
            displayHeight={72}
            style={{ margin: 0, flexShrink: 0, opacity: 0.9 }}
          />
        )}
      </div>
    </div>
  );
}
