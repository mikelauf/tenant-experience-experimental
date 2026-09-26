/** Ported from Tenant Experience (src/lib/public-venues/campaign.ts). */
const STORAGE_KEY = "public-venue-campaign";
type CampaignStorage = Pick<Storage, "getItem" | "setItem">;

/** Keep only Core's campaign string for this tab/origin; never persist contact or form data. */
export function resolvePublicCampaign(search: string, storage?: CampaignStorage): string {
  const current = new URLSearchParams(search).get("utm_campaign")?.trim().slice(0, 200);
  if (current) {
    try { storage?.setItem(STORAGE_KEY, current); } catch { /* Storage is optional. */ }
    return current;
  }
  try { return storage?.getItem(STORAGE_KEY)?.trim().slice(0, 200) ?? ""; }
  catch { return ""; }
}

/** Resolve browser attribution even when session storage access is blocked. */
export function getPublicCampaign(): string {
  // Accessing sessionStorage itself can throw when browser storage is blocked.
  let storage: CampaignStorage | undefined;
  try { storage = window.sessionStorage; } catch { /* URL attribution still works. */ }
  return resolvePublicCampaign(window.location.search, storage);
}
