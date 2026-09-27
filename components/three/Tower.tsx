"use client";

import dynamic from "next/dynamic";
import { useTenant } from "@/lib/tenants/client";
import { Lazy3D } from "./Lazy3D";
import type { Band, Pin, TowerCanvasProps } from "./tower/TowerCanvas";

const TowerCanvas = dynamic(() => import("./tower/TowerCanvas"), { ssr: false });

export type { Band, Pin };

/** The current building, procedurally, from its tower profile. Everything but the frame passes straight to the canvas. */
export function Tower({
  className,
  poster,
  placeholder,
  eager,
  ...scene
}: Omit<TowerCanvasProps, "profile" | "accent" | "active" | "onReady"> & {
  className?: string;
  poster: React.ReactNode;
  /** Shown instead of the poster while the scene loads */
  placeholder?: React.ReactNode;
  /** Load when the page is idle rather than when scrolled near */
  eager?: boolean;
}) {
  const { tower, theme } = useTenant();
  return (
    <Lazy3D className={className} poster={poster} placeholder={placeholder} eager={eager}>
      {({ active, onReady }) => <TowerCanvas {...scene} profile={tower} accent={theme.glow} active={active} onReady={onReady} />}
    </Lazy3D>
  );
}
