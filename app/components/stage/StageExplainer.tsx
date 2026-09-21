'use client';

/** Single compact explainer for 3D stage dashboards — replaces dual red/blue banners. */
export default function StageExplainer({
  title,
  body,
  metricNote,
  focusHref,
}: {
  title: string;
  body: string;
  metricNote?: string;
  /** When set, shows a "Focus view" button that pops this stage out into its own window at focusHref. */
  focusHref?: string;
}) {
  const openFocus = () => {
    if (!focusHref) return;
    // A separate OS-level window doesn't mean anything on a phone (mobile
    // browsers just open it as another tab) — there, navigate to the focus
    // route in place instead, full-screen, with its own close button.
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.location.href = focusHref;
      return;
    }
    const w = 1180;
    const h = 820;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    // Marks this as a real popup window (vs. the mobile in-place navigation
    // above) so FocusCloseButton knows "close" means close the window, not
    // navigate back — using a URL flag rather than window.opener, since
    // that's more reliable across browsers than relying on the opener
    // reference sticking around.
    window.open(
      `${focusHref}?popup=1`,
      `ozzy-focus:${focusHref}`,
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <div className="stage-explainer">
      <div className="stage-explainer-hdr">
        <div className="stage-explainer-title">{title}</div>
        {focusHref && (
          <button type="button" className="stage-focus-btn" onClick={openFocus}>
            ⤢ Expand full screen
          </button>
        )}
      </div>
      <p className="stage-explainer-body">{body}</p>
      {metricNote && <p className="stage-explainer-note">{metricNote}</p>}
    </div>
  );
}
