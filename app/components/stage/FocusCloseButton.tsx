'use client';

/**
 * Closes a stage's focus view. Desktop opens it as a real popup window
 * (URL carries ?popup=1, set by StageExplainer's openFocus), so closing
 * there closes the window. Mobile opens it as a normal in-page navigation
 * instead (a separate OS window means nothing on a phone) — there, "close"
 * means go back to the dashboard.
 */
export default function FocusCloseButton() {
  const close = () => {
    const isPopup = new URLSearchParams(window.location.search).get('popup') === '1';
    if (isPopup) {
      window.close();
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <button type="button" className="refresh-btn stage-toolbar-close" onClick={close} aria-label="Close focus view">
      × Close
    </button>
  );
}
