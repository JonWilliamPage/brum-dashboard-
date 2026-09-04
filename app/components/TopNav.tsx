'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import BullAscii from './BullAscii';

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/about') return pathname === '/' || pathname === '/about';
    return pathname.startsWith(href);
  };

  const links = [
    { href: '/about',     label: 'About' },
    { href: '/ozzy',      label: 'Ask Ozzy' },
    { href: '/dashboard', label: 'Dashboards' },
    { href: '/review',    label: 'Review' },
    { href: '/sources',   label: 'Data Sources' },
  ];

  return (
    <header className="top-nav">
      <div className="top-nav-bar">
        <a href="/about" className="top-nav-brand" aria-label="Ozzy — an open-source civic intelligence prototype for Birmingham — Home">
          <BullAscii
            animate
            textColor="#0e0f11"
            sweepColor="#efb700"
            cols={38}
            rows={24}
            minAlpha={0.85}
            scanInterval={1500}
            displayWidth={60}
            displayHeight={60}
            style={{ margin: '-8px 0', flexShrink: 0, cursor: 'pointer' }}
          />
          <div className="top-nav-brand-text">
            <div className="top-nav-brand-name">Ozzy</div>
            <div className="top-nav-brand-sub">Civic intelligence prototype</div>
          </div>
        </a>

        <nav className={`top-nav-links${open ? ' top-nav-open' : ''}`} aria-label="Primary">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={`top-nav-link${isActive(l.href) ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/willspensley/brum-dashboard-"
            target="_blank"
            rel="noopener noreferrer"
            className="top-nav-link top-nav-link-ext"
          >
            GitHub ↗
          </a>
          <a
            href="mailto:westmidlands@lookingforgrowth.uk"
            className="top-nav-cta"
          >
            Contribute →
          </a>
        </nav>

        <button
          className="top-nav-mobile-toggle"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            {open ? (
              <>
                <path d="M1 1l20 12M1 13L21 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M1 1.5h20M1 7h20M1 12.5h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>
      <div className="top-nav-dancetty" />
    </header>
  );
}
