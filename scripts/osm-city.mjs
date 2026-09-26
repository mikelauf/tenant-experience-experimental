#!/usr/bin/env node
/**
 * Fetches the real buildings, streets and parks around a tower from OpenStreetMap (via Overpass) and writes
 * them in scene units for the 3D explorer. Run it again to refresh the data:
 *
 *   node scripts/osm-city.mjs
 *
 * Scene frame: the Pyramid's centre is the origin and one unit is `M_PER_UNIT` metres (the scale the tower
 * profile is drawn at: its 853 ft / 260 m height is 13.7 units). Axes follow the street grid, not the compass:
 * downtown San Francisco's grid, and the Pyramid on it, sits a few degrees off true north, so the map is turned
 * until Montgomery Street runs straight up −z. That angle is measured from the streets themselves and written
 * out as `grid`; the tower profile's `north` must match it so compass bearings (landmarks, the compass) stay true.
 * Data © OpenStreetMap contributors, ODbL. The site must credit it wherever the buildings are shown.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OUT = "public/data/pyramid-city.json";
// Transamerica Pyramid, OSM way 24222973
const CENTER = { lat: 37.7951663, lon: -122.4027858 };
const SELF = new Set([24222973]);
const M_PER_UNIT = 18.8;
const RADIUS_M = 290;
const KEEP_UNITS = 14.2; // matches the scene's ground disc (14.5)

const ROAD_M = {
  motorway: 20,
  trunk: 18,
  primary: 16,
  secondary: 14,
  tertiary: 12,
  residential: 10,
  unclassified: 10,
  living_street: 8,
  pedestrian: 6,
  service: 5,
};

const query = `[out:json][timeout:90];
(
  way["building"](around:${RADIUS_M},${CENTER.lat},${CENTER.lon});
  way["building:part"](around:${RADIUS_M},${CENTER.lat},${CENTER.lon});
  relation["building"](around:${RADIUS_M},${CENTER.lat},${CENTER.lon});
  way["highway"](around:${RADIUS_M + 60},${CENTER.lat},${CENTER.lon});
  way["leisure"="park"](around:${RADIUS_M},${CENTER.lat},${CENTER.lon});
);
out geom tags;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "User-Agent": "pyramid-venues/0.1 (3D site map of the Transamerica Pyramid block)", Accept: "application/json" },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
const { elements } = await res.json();

/* ---------------------------------------------------------------- projection */

const rad = (d) => (d * Math.PI) / 180;
const mLat = 111132.92 - 559.82 * Math.cos(2 * rad(CENTER.lat));
const mLon = 111412.84 * Math.cos(rad(CENTER.lat));
const toMap = ({ lat, lon }) => [((lon - CENTER.lon) * mLon) / M_PER_UNIT, (-(lat - CENTER.lat) * mLat) / M_PER_UNIT];

// The grid's tilt: length-weighted heading of the north–south streets, in degrees clockwise from true north
const NS = new Set(["Montgomery Street", "Kearny Street", "Sansome Street", "Battery Street"]);
let sx = 0;
let sz = 0;
for (const el of elements) {
  if (el.type !== "way" || !NS.has(el.tags?.name) || !el.geometry) continue;
  for (let i = 1; i < el.geometry.length; i++) {
    const [x1, z1] = toMap(el.geometry[i - 1]);
    const [x2, z2] = toMap(el.geometry[i]);
    // Point every segment north (−z), then add it up as a vector
    const [dx, dz] = z2 < z1 ? [x2 - x1, z2 - z1] : [x1 - x2, z1 - z2];
    sx += dx;
    sz += dz;
  }
}
const GRID = (Math.atan2(sx, -sz) * 180) / Math.PI;
const cosG = Math.cos(rad(GRID));
const sinG = Math.sin(rad(GRID));
/** Map coordinates turned so the grid's north runs up −z */
const toScene = (ll) => {
  const [x, z] = toMap(ll);
  return [x * cosG + z * sinG, -x * sinG + z * cosG];
};
const r2 = (n) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------- geometry helpers */

const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};
const centroid = (pts) => pts.reduce(([sx, sz], [x, z]) => [sx + x / pts.length, sz + z / pts.length], [0, 0]);
const inside = ([x, z], pts) => {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
};

/** Drops the closing point, near-duplicates (under ~0.5 m) and near-collinear points; winds counter-clockwise in x/z. */
function clean(raw) {
  let pts = raw.map(toScene);
  if (pts.length > 1) {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) pts.pop();
  }
  pts = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.03);
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cross) < 0.002) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  if (pts.length < 3) return null;
  if (area(pts) < 0) pts.reverse();
  return pts;
}

/* ---------------------------------------------------------------- heights */

const metres = (v) => {
  if (!v) return null;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  return /ft|'/.test(v) ? n * 0.3048 : n;
};
const LEVEL_M = 3.6;
function heights(tags) {
  const levels = parseFloat(tags["building:levels"]);
  const roof = parseFloat(tags["roof:levels"]) || 0;
  let h = metres(tags.height) ?? (Number.isFinite(levels) ? (levels + roof) * LEVEL_M + 1 : null);
  const minLevel = parseFloat(tags["building:min_level"]);
  const base = metres(tags.min_height) ?? (Number.isFinite(minLevel) ? minLevel * LEVEL_M : 0);
  // Unknown heights: small downtown buildings are mostly three to five storeys
  if (h == null) h = tags.building === "house" || tags.building === "garage" ? 8 : 15;
  return { h: h / M_PER_UNIT, b: base / M_PER_UNIT, known: tags.height != null || Number.isFinite(levels) };
}

/* ---------------------------------------------------------------- buildings */

const rings = (el) => {
  if (el.type === "way") return el.geometry ? [el.geometry] : [];
  return (el.members ?? []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry);
};

const parts = [];
const outlines = [];
for (const el of elements) {
  const t = el.tags ?? {};
  if (!t.building && !t["building:part"]) continue;
  if (SELF.has(el.id)) continue;
  for (const ring of rings(el)) {
    const pts = clean(ring);
    if (!pts) continue;
    const item = { id: el.id, pts, ...heights(t), name: t.name };
    (t["building:part"] ? parts : outlines).push(item);
  }
}
// Where a building is mapped in parts, the parts carry its real 3D shape; drop the outline they sit inside
const kept = [...parts, ...outlines.filter((o) => !parts.some((p) => inside(centroid(p.pts), o.pts)))];

const buildings = kept
  .filter((b) => {
    const [cx, cz] = centroid(b.pts);
    const d = Math.hypot(cx, cz);
    // The Pyramid itself (and any of its parts) is drawn by the tower profile
    return d < KEEP_UNITS && d > 1.9 && b.h - b.b > 0.05 && Math.abs(area(b.pts)) > 0.02;
  })
  .map((b) => ({ p: b.pts.flatMap(([x, z]) => [r2(x), r2(z)]), h: r2(b.h), ...(b.b > 0 && { b: r2(b.b) }), ...(b.name && { n: b.name }) }));

/* ---------------------------------------------------------------- streets and parks */

const roads = elements
  .filter((el) => el.type === "way" && el.tags?.highway && ROAD_M[el.tags.highway] && el.geometry)
  .filter((el) => el.tags.area !== "yes")
  .map((el) => {
    const w = (el.tags.service === "alley" ? 4 : ROAD_M[el.tags.highway]) / M_PER_UNIT;
    const pts = el.geometry.map(toScene);
    return { p: pts.flatMap(([x, z]) => [r2(x), r2(z)]), w: r2(w), ...(el.tags.name && { n: el.tags.name }) };
  })
  .filter((r) => {
    for (let i = 0; i < r.p.length; i += 2) if (Math.hypot(r.p[i], r.p[i + 1]) < KEEP_UNITS + 2) return true;
    return false;
  });

const parks = elements
  .filter((el) => el.tags?.leisure === "park")
  .flatMap(rings)
  .map(clean)
  .filter(Boolean)
  .map((pts) => pts.flatMap(([x, z]) => [r2(x), r2(z)]));

const out = {
  source: "© OpenStreetMap contributors (ODbL)",
  fetched: new Date().toISOString().slice(0, 10),
  center: CENTER,
  mPerUnit: M_PER_UNIT,
  grid: Math.round(GRID * 10) / 10,
  buildings,
  roads,
  parks,
};
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));

const known = kept.filter((b) => b.known).length;
console.log(`Street grid: ${GRID.toFixed(2)}° from true north`);
console.log(`${buildings.length} buildings (${known} of ${kept.length} with mapped heights), ${roads.length} street segments, ${parks.length} parks → ${OUT}`);
