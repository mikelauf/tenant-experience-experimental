import { cookies, headers } from "next/headers";
import { isDemo } from "@/lib/flags";
import { TENANT_COOKIE, tenantById, tenantForHost } from ".";

/**
 * The building for this request. In production the hostname decides; in the demo,
 * a cookie the demo dock sets, so one deployment can show every building.
 */
export async function getTenant() {
  if (!isDemo) return tenantForHost((await headers()).get("host"), process.env.PRODUCTION_TENANT);
  return tenantById((await cookies()).get(TENANT_COOKIE)?.value);
}
