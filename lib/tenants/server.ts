import { cookies, headers } from "next/headers";
import { isDemo } from "@/lib/flags";
import { TENANT_COOKIE, TENANTS, tenantById, tenantForHost } from ".";

/**
 * The building for this request. In production the hostname decides; in the demo,
 * a cookie the demo dock sets, so one deployment can show every building.
 *
 * A production build that carries a single building never reads the request, so its pages prerender.
 */
export async function getTenant() {
  if (!isDemo) {
    const built = Object.values(TENANTS);
    if (built.length === 1) return built[0]!;
    return tenantForHost((await headers()).get("host"), process.env.PRODUCTION_TENANT);
  }
  return tenantById((await cookies()).get(TENANT_COOKIE)?.value);
}
