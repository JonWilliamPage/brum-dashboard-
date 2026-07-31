'use client';

/** Single compact explainer for 3D stage dashboards — replaces dual red/blue banners. */
export default function StageExplainer({
  title,
  body,
  metricNote,
}: {
  title: string;
  body: string;
  metricNote?: string;
}) {
  return (
    <div className="stage-explainer">
      <div className="stage-explainer-title">{title}</div>
      <p className="stage-explainer-body">{body}</p>
      {metricNote && <p className="stage-explainer-note">{metricNote}</p>}
    </div>
  );
}
