// Shared bilingual text helper for archive entries.
//
// Every entry stores each field twice: an English value (`title_en`) and a
// Khmer value (`title_km`). Which one is required depends on the language the
// contributor was using, so either side can legitimately be empty. When a
// visitor flips the language toggle and the active language's value is missing,
// we fall back to the other language rather than showing a blank, and report
// that the value came from the other language so the UI can show a subtle hint.

/**
 * Resolve a bilingual entry field for the active language.
 *
 * Reads `entry[`${base}_${language}`]` first; if that is empty it falls back to
 * the other language's value. This fallback is symmetric (km → en and en → km),
 * unlike a plain "always fall back to English", so a Khmer-only entry still
 * shows its Khmer text when the visitor is in English mode.
 *
 * @param {object|null|undefined} entry - A row from the `entries` table.
 * @param {string} base - Field base name, e.g. "title", "contributor",
 *   "places", or "description".
 * @param {"en"|"km"} language - The active language.
 * @returns {{ text: string, isFallback: boolean }} `text` is the resolved value
 *   (empty string when neither language has one). `isFallback` is true only when
 *   the returned text came from the language that is *not* active.
 */
export function pickEntryText(entry, base, language) {
  if (!entry) return { text: "", isFallback: false };

  const other = language === "en" ? "km" : "en";
  const active = entry[`${base}_${language}`];
  if (active) return { text: active, isFallback: false };

  const fallback = entry[`${base}_${other}`];
  if (fallback) return { text: fallback, isFallback: true };

  return { text: "", isFallback: false };
}

/**
 * Human-readable label for the language a fallback value came from, in the
 * active language. Used by the "shown in …" hint next to borrowed text.
 * @param {"en"|"km"} fromLanguage
 * @param {"en"|"km"} activeLanguage
 * @returns {string}
 */
export function fallbackLanguageLabel(fromLanguage, activeLanguage) {
  const names = {
    en: { en: "English", km: "អង់គ្លេស" },
    km: { en: "Khmer", km: "ខ្មែរ" },
  };
  return names[fromLanguage][activeLanguage] || names[fromLanguage].en;
}
