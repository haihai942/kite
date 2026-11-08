// Shared date formatting helpers.
//
// Entries come back from Supabase with `created_at` as an ISO-8601 string in
// UTC (e.g. "2026-11-03T00:30:00.000000Z"). This archive is curated in Phnom
// Penh, so a 00:30 UTC submission was really made at 07:30 the same morning
// local time — showing the raw UTC value would be off by seven hours. A
// contributor would otherwise see whatever their own browser happens to
// prefer. To keep the review queue readable and identical for everyone, we:
//   1. anchor the output to Asia/Phnom_Penh (UTC+7, no daylight saving) so the
//      time shown is the local time the entry was submitted, and
//   2. pin the locale to "en-GB" so the shape is always "3 November 2026,
//      07:30" instead of flipping between "11/3/2026" and "3/11/2026".

/**
 * Turn a stored UTC timestamp into a clean, human-readable submission date in
 * Phnom Penh time.
 * @param {string|Date|null|undefined} value - Usually `entry.created_at`.
 * @returns {string} e.g. "3 November 2026, 07:30", or
 *   "Date not recorded" when the value is missing or unparseable.
 */
export function formatSubmissionDate(value) {
  if (!value) return "Date not recorded";

  const date = new Date(value);
  // `new Date(...)` yields "Invalid Date" for junk input rather than throwing,
  // so check the parsed time instead of relying on a try/catch.
  if (Number.isNaN(date.getTime())) return "Date not recorded";

  return `${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Phnom_Penh",
  })}, ${date.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Phnom_Penh",
  })}`;
}
