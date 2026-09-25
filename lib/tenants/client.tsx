"use client";

import { createContext, useContext } from "react";
import { DEFAULT_TENANT, TENANT_COOKIE, tenantById, type Tenant, type TenantId } from ".";

const Ctx = createContext<Tenant>(tenantById(DEFAULT_TENANT));

/** Only the id crosses the server/client boundary; both sides resolve the same bundle from it. */
export function TenantProvider({ id, children }: { id: TenantId; children: React.ReactNode }) {
  return <Ctx value={tenantById(id)}>{children}</Ctx>;
}

export const useTenant = () => useContext(Ctx);

/** The active building id, readable outside React (the demo store keys its state by it). */
export const activeTenantId = (): TenantId => {
  if (typeof document === "undefined") return DEFAULT_TENANT;
  return tenantById(document.documentElement.dataset.building).id;
};

export function switchTenant(id: TenantId) {
  document.cookie = `${TENANT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}
