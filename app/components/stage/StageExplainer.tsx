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
    const w = 1180;
    const h = 820;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    window.open(
      focusHref,
      `ozzy-focus:${focusHref}`,
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener,noreferrer`
    );
  };

  return (
    <div className="stage-explainer">
      <div className="stage-explainer-hdr">
        <div className="stage-explainer-title">{title}</div>
        {focusHref && (
          <button type="button" className="stage-focus-btn" onClick={openFocus}>
            ⤢ Focus view
          </button>
        )}
      </div>
      <p className="stage-explainer-body">{body}</p>
      {metricNote && <p className="stage-explainer-note">{metricNote}</p>}
    </div>
  );
}
