/**
 * Where the sun is over a building at a given moment, and when the light changes that day. NOAA's solar
 * position equations (good to well under a degree), with no dependencies. Framework-free, so the tests,
 * the 3D scene and the event brief share it. Times are the building's own local time, whatever the viewer's.
 */

export type Geo = { lat: number; lng: number; tz: string };

const rad = Math.PI / 180;
const deg = 180 / Math.PI;

/** Sun elevation above the horizon and azimuth (clockwise from true north), in degrees, at a UTC instant. */
export function sunPosition(at: Date, { lat, lng }: Pick<Geo, "lat" | "lng">) {
  const jd = at.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) + Math.sin(3 * m * rad) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan((eps / 2) * rad) ** 2;
  // Equation of time, in minutes
  const eot =
    4 *
    deg *
    (y * Math.sin(2 * l0 * rad) -
      2 * e * Math.sin(m * rad) +
      4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad) -
      0.5 * y * y * Math.sin(4 * l0 * rad) -
      1.25 * e * e * Math.sin(2 * m * rad));
  const utcMin = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const solar = (((utcMin + eot + 4 * lng) % 1440) + 1440) % 1440;
  const hour = solar / 4 - 180;
  const phi = lat * rad;
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hour * rad);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZ)));
  const az = Math.atan2(Math.sin(hour * rad), Math.cos(hour * rad) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * deg + 180;
  return { elevation: 90 - zenith * deg, azimuth: ((az % 360) + 360) % 360 };
}

/** A wall-clock time in a time zone ("2026-10-12", "19:00", "America/Los_Angeles") as a real instant. */
export function zonedTime(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const want = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const wall = (ms: number) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  // The zone's offset at that moment; twice, so a guess on the far side of a clock change settles
  let ms = want - (wall(want) - want);
  ms = want - (wall(ms) - ms);
  return new Date(ms);
}

/** The building's own date ("YYYY-MM-DD") and minutes after midnight at an instant, whatever the viewer's time zone. */
export function nowIn(tz: string, at = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour * 60 + +p.minute };
}

/** Minutes after local midnight to "7:05 pm". */
export const clock = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/** "19:30" to minutes after midnight, or null. */
export const minutesOf = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
};

export type Light = "day" | "golden" | "dusk" | "night";

/** What the light is like at a sun elevation: golden hour runs from 6° above the horizon to sunset, dusk (the blue hour) to 6° below. */
export const lightAt = (elevation: number): Light => (elevation > 6 ? "day" : elevation > -0.833 ? "golden" : elevation > -6 ? "dusk" : "night");

export const LIGHT_LABEL: Record<Light, string> = { day: "Daylight", golden: "Golden hour", dusk: "Dusk", night: "After dark" };

/**
 * The day's light at the building: sunset, and golden hour and dusk before and after it, in local minutes. Found by
 * stepping through the afternoon and evening minute by minute, which is fast (about a millisecond) and has no edge cases.
 */
export function eveningOf(date: string, geo: Geo) {
  // Clocks change at 2 am, so from noon on the day's offset holds: one time-zone lookup, then plain minutes
  const noon = zonedTime(date, "12:00", geo.tz).getTime();
  const at = (min: number) => sunPosition(new Date(noon + (min - 720) * 60000), geo).elevation;
  const cross = (level: number, from: number, to: number) => {
    let prev = at(from);
    for (let m = from + 1; m <= to; m++) {
      const e = at(m);
      if (prev >= level && e < level) return m;
      prev = e;
    }
    return null;
  };
  const golden = cross(6, 12 * 60, 23 * 60 + 59);
  const sunset = cross(-0.833, 12 * 60, 23 * 60 + 59);
  const dark = cross(-6, 12 * 60, 23 * 60 + 59);
  return { golden, sunset, dark };
}

/**
 * The scene's light level (0 night · 0.5 dusk · 1 day) for a sun elevation. Dusk is the sun at the horizon; full
 * night once it's 8° down; full day from 15° up. Eased, so the light never jumps.
 */
export function sunLevel(elevation: number) {
  const s = (x: number) => x * x * (3 - 2 * x);
  if (elevation <= -8) return 0;
  if (elevation <= 0) return 0.5 * s((elevation + 8) / 8);
  if (elevation >= 15) return 1;
  return 0.5 + 0.5 * s(elevation / 15);
}
