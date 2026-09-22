// Feature switches for the shipped demonstrator.
//
// Ozzy is a civic *intelligence prototype* — its job right now is presenting real,
// sourced data well. The conversational layer is a later phase, not part of this
// release. See docs/FUTURE-DIRECTIONS.md and the CHANGELOG section
// "Withheld pending data fixes".

// Ask Ozzy — the conversational layer (/ozzy, the nav and footer links, and the
// in-dashboard entry point).
//
// Disabled for the 2026-09-22 demonstrator for two independent reasons:
//   1. `buildDataBlock()` in app/components/OzzyView.tsx assembles the model's
//      entire context from `wards`, which is built from the legacy 68-ward
//      FALLBACK roster in lib/data.ts. 33 of its ward codes collide with the
//      canonical ONS set and every one names a different ward, and the city
//      averages it computes include `city_avg_gva_per_head_k`, which is
//      synthesised. The model would state those figures in prose, confidently.
//   2. app/ozzy/page.tsx carries hardcoded example answers quoting specific
//      wards and rates, which are on the same legacy roster.
//
// To reinstate: set this to `true` — but only once `FALLBACK` has been retired in
// favour of lib/wards.ts, the context is rebuilt from the canonical datasets, and
// the canned answers on /ozzy are re-derived from real figures.
export const ASK_OZZY_CHAT_ENABLED = false;
