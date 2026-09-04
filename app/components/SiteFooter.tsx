import BullAscii from './BullAscii';
import { WARD_COUNT } from '@/lib/wards';

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot-dancetty" />
      <div className="site-foot-inner">

        <div className="site-foot-cols">
          <div className="site-foot-col">
            <div className="site-foot-brand">
              <BullAscii
                textColor="#15181e"
                cols={40}
                rows={26}
                minAlpha={0.5}
                displayWidth={36}
                displayHeight={44}
                style={{ margin: 0, flexShrink: 0 }}
              />
              <div>
                <div className="site-foot-brand-name">Ozzy</div>
                <div className="site-foot-brand-sub">Civic intelligence prototype</div>
              </div>
            </div>
            <p className="site-foot-blurb">
              Ozzy is an open-source civic intelligence prototype for Birmingham. Every line of code, every dataset, every methodology — public.
            </p>
          </div>

          <div className="site-foot-col">
            <div className="site-foot-col-ttl">Explore</div>
            <a href="/about">About Ozzy</a>
            <a href="/ozzy">Ask Ozzy</a>
            <a href="/dashboard">Dashboards</a>
            <a href="/sources">Data Sources</a>
            <a href="/privacy">Privacy</a>
          </div>

          <div className="site-foot-col">
            <div className="site-foot-col-ttl">Contribute</div>
            <a href="https://github.com/willspensley/brum-dashboard-" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href="mailto:westmidlands@lookingforgrowth.uk">Join the Ozzy team →</a>
            <span className="site-foot-note">No coding required.<br />Brummies welcome.</span>
          </div>

          <div className="site-foot-col site-foot-col-scroll">
            <svg viewBox="0 0 200 44" width="170" height="38" aria-label="Forward — city motto">
              <path d="M14 14 L2 8 L6 22 L2 36 L14 30 Z" fill="var(--herald-navy)" />
              <path d="M186 14 L198 8 L194 22 L198 36 L186 30 Z" fill="var(--herald-navy)" />
              <path d="M14 8 L186 8 L180 22 L186 36 L14 36 L20 22 Z" fill="#f6f4ee" stroke="var(--herald-navy)" strokeWidth="1.4" />
              <text x="100" y="27" textAnchor="middle" fontFamily="Baskervville, Georgia, serif" fontSize="15" fontWeight="600" letterSpacing="3" fill="var(--herald-red)">FORWARD</text>
            </svg>
            <div className="site-foot-motto">Birmingham&apos;s city motto, since 1889.</div>
          </div>
        </div>

        <div className="site-foot-bottom">
          <div>© Ask Ozzy contributors · {new Date().getFullYear()} · Independent project — uses public Birmingham data. Not affiliated with Birmingham City Council.</div>
          <div className="site-foot-bottom-meta">
            Base geography: <strong>E08000025</strong> · {WARD_COUNT} wards (Dec 2022) · Data: NOMIS · IMD 2025 · Census 2021 · WMP · City Observatory
          </div>
        </div>

      </div>
    </footer>
  );
}
