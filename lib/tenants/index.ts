import type { CSSProperties } from "react";
import { meridian } from "./meridian";
import { pyramid } from "./pyramid";
import type { Tenant, TenantId } from "./types";

/** Every building this Playbook deployment serves. In production the address picks one; here the demo dock does. */
export const TENANTS: Record<TenantId, Tenant> = { pyramid, meridian };

export const TENANT_COOKIE = "pb-building";
export const DEFAULT_TENANT: TenantId = "pyramid";

export const isTenantId = (v: unknown): v is TenantId => typeof v === "string" && v in TENANTS;
export const tenantById = (id: unknown): Tenant => TENANTS[isTenantId(id) ? id : DEFAULT_TENANT];

/** Accent colors as CSS custom properties, applied to <html> so there's no flash of the wrong brand. */
export const themeVars = (t: Tenant) =>
  ({
    "--color-accent": t.theme.accent,
    "--color-accent-deep": t.theme.deep,
    "--color-accent-soft": t.theme.soft,
    "--color-accent-glow": t.theme.glow,
  }) as CSSProperties;

export type { Tenant, TenantId } from "./types";
