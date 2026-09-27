import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { readBrief } from "@/lib/brief";
import { setupLabels } from "@/lib/data/shared";
import { clock, eveningOf, minutesOf } from "@/lib/sun";
import { getTenant } from "@/lib/tenants/server";
import { formatDate } from "@/lib/format";

// The brand face, read once. A static instance: the renderer can't use variable fonts.
const font = readFile(new URL("./InstrumentSans-Medium.ttf", import.meta.url));

/** The building's own photo, for a brief of several venues. */
const BUILDING = "tap-8a345d4546";

/**
 * The link card for an event brief (Open Graph / Twitter), so a pasted brief unfurls in Slack or iMessage as
 * the venue, the date and the guest count. Photos come from `public/images/og`, JPEG crops of each hero made by
 * `scripts/og-images.mjs`, since the renderer can't read WebP.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const t = await getTenant();
  const b = readBrief(url.searchParams, t.venues);
  const vs = b.venues.map((x) => t.venue(x.slug)!).filter(Boolean);
  const one = vs.length === 1 ? vs[0] : undefined;
  const id = one?.hero.src.match(/\/([^/]+)\.webp$/)?.[1] ?? BUILDING;
  const photo = new URL(`/images/og/${id}.jpg`, url.origin);
  const ok = (await fetch(photo, { method: "HEAD" }).catch(() => null))?.ok;

  const title = vs.length ? vs.map((v) => v.name.replace(/^Transamerica /, "")).join(" · ") : t.building.name;
  const setup = one && b.venues[0].setup ? `${setupLabels[b.venues[0].setup]}` : null;
  const sunset = b.date && t.tower.geo ? eveningOf(b.date, t.tower.geo).sunset : null;
  const line = [
    b.date && `${formatDate(b.date)}${b.time ? `, ${clock(minutesOf(b.time)!)}` : ""}`,
    b.guests && `${b.guests.toLocaleString("en-US")} guests${setup ? `, ${setup.toLowerCase()}` : ""}`,
    sunset != null && `Sunset ${clock(sunset)}`,
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#151b21", fontFamily: "Instrument" }}>
        {ok && (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page
          <img src={photo.toString()} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(180deg, rgba(10,14,18,0.1) 0%, rgba(10,14,18,0.15) 30%, rgba(10,14,18,0.78) 58%, rgba(10,14,18,0.96) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 56, display: "flex", flexDirection: "column", color: "#f4f1ea" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: "rgba(244,241,234,0.75)" }}>
            {`Event brief · ${t.building.name}`}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: vs.length > 2 ? 64 : 88, lineHeight: 1, letterSpacing: -3 }}>{title}</div>
          {line.length > 0 && <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: "rgba(244,241,234,0.88)" }}>{line.join("  ·  ")}</div>}
        </div>
        <div style={{ position: "absolute", top: 48, right: 64, width: 18, height: 18, borderRadius: 999, background: t.theme.glow }} />
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Instrument", data: await font, weight: 500, style: "normal" }] },
  );
}
