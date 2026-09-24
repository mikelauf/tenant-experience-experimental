"use client";

import dynamic from "next/dynamic";
import { Lazy3D } from "./Lazy3D";
import type { Mood } from "./pyramid/PyramidCanvas";

const PyramidCanvas = dynamic(() => import("./pyramid/PyramidCanvas"), { ssr: false });

export function Pyramid({
  level,
  mood,
  className,
  poster,
  auto,
}: {
  level: number | null;
  mood?: Mood;
  className?: string;
  poster: React.ReactNode;
  auto?: boolean;
}) {
  return (
    <Lazy3D className={className} poster={poster}>
      {({ active, onReady }) => <PyramidCanvas level={level} mood={mood} active={active} onReady={onReady} auto={auto} />}
    </Lazy3D>
  );
}
