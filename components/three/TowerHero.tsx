"use client";

import { Mark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { Tower } from "./Tower";

/**
 * A hero for a building with no photography yet: its own tower at blue hour,
 * turning slowly. The poster (reduced motion, no WebGL) is the mark on the same sky.
 */
export function TowerHero({ className, framing = "overview" }: { className?: string; framing?: "overview" | "plaza" }) {
  return (
    <div className={cn("overflow-hidden bg-[radial-gradient(120%_90%_at_60%_0%,#3a4d66_0%,#141a21_55%,#0b0e12_100%)]", className)}>
      <Tower
        level={framing === "plaza" ? 0 : null}
        sun={0.32}
        className="absolute inset-0 lg:left-[28%]"
        poster={
          <div className="grid h-full place-items-center">
            <Mark size={220} className="text-moon/15" />
          </div>
        }
      />
    </div>
  );
}
