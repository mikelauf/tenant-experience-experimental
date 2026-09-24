"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const noop = () => () => {};
let webgl: boolean | undefined;
const hasWebGLCached = () => (webgl ??= hasWebGL());

/**
 * Shared shell for WebGL scenes: mounts when near the viewport, renders frames
 * only while visible, and shows a poster for reduced motion / no WebGL / loading.
 */
export function Lazy3D({
  className,
  poster,
  children,
}: {
  className?: string;
  poster: React.ReactNode;
  children: (s: { active: boolean; onReady: () => void }) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ok = useSyncExternalStore(noop, hasWebGLCached, () => null);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const use3d = !!ok && !reduce;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn("absolute inset-0 transition-opacity duration-700", use3d && ready ? "pointer-events-none opacity-0" : "opacity-100")}
        aria-hidden={use3d && ready}
      >
        {poster}
      </div>
      {use3d && (visible || ready) && (
        <div
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-[1400ms] ease-[var(--ease-out-expo)]",
            ready ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
          )}
        >
          {children({ active: visible, onReady: () => setReady(true) })}
        </div>
      )}
    </div>
  );
}
