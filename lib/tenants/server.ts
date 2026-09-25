import { cookies } from "next/headers";
import { TENANT_COOKIE, tenantById } from ".";

/** The building for this request. In production the hostname decides; in the prototype, a cookie the demo dock sets. */
export async function getTenant() {
  return tenantById((await cookies()).get(TENANT_COOKIE)?.value);
}
