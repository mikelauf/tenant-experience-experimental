"use client";

import dynamic from "next/dynamic";
import { useTenant } from "@/lib/tenants/client";
import { Lazy3D } from "./Lazy3D";
import type { Band, Pin } from "./tower/TowerCanvas";

const TowerCanvas = dynamic(() => import("./tower/TowerCanvas"), { ssr: false });

export type { Band, Pin };

/** The current building, procedurally, from its tower profile. */
export function Tower({
  level,
  sun,
  className,
  poster,
  auto,
  onInteract,
  bands,
  pins,
  onPick,
}: {
  level: number | null;
  /** 0 night · 0.5 dusk · 1 day */
  sun?: number;
  className?: string;
  poster: React.ReactNode;
  auto?: boolean;
  onInteract?: () => void;
  bands?: Band[];
  pins?: Pin[];
  onPick?: (floor: number) => void;
}) {
  const { tower, theme } = useTenant();
  return (
    <Lazy3D className={className} poster={poster}>
      {({ active, onReady }) => (
        <TowerCanvas
          profile={tower}
          level={level}
          sun={sun}
          accent={theme.glow}
          active={active}
          onReady={onReady}
          auto={auto}
          onInteract={onInteract}
          bands={bands}
          pins={pins}
          onPick={onPick}
        />
      )}
    </Lazy3D>
  );
}
