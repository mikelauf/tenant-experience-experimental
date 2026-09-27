/** Small display helpers shared by server and client code. Keep them out of "use client" modules so both can call them. */

/** "Thu, Nov 12, 2026" for a "YYYY-MM-DD" value, read as a local calendar date so the day never shifts. */
export const formatDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : s;
};

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
/** The 16-point compass name for a bearing: 335 → "NNW". */
export const compass = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
