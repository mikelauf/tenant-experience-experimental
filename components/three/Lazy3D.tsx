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
 *
 * `eager` scenes mount as soon as the page is idle instead, so they're drawn before anyone scrolls to
 * them; a number waits that many ms first, so several eager scenes on one page don't all start together.
 * Phones skip the idle load to spare their GPU and memory, and mount about a screen and a half
 * early instead. `placeholder` replaces the poster while loading (the poster stays the no-3D fallback).
 *
 * Scenes mount a screen before they're reached, and a scene that has been seen unmounts once it's more than
 * a screen and a half away (its poster comes back), so a long page never holds more than a couple of live
 * WebGL contexts. Coming back near mounts it again.
 */
export function Lazy3D({
  className,
  poster,
  placeholder = poster,
  eager,
  children,
}: {
  className?: string;
  poster: React.ReactNode;
  placeholder?: React.ReactNode;
  eager?: boolean | number;
  children: (s: { active: boolean; onReady: () => void }) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ok = useSyncExternalStore(noop, hasWebGLCached, () => null);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [idle, setIdle] = useState(false);
  const [near, setNear] = useState(false);
  const [inRange, setInRange] = useState(true);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!eager) return;
    if (!matchMedia("(min-width: 1024px)").matches) {
      const el = ref.current;
      if (!el) return;
      const io = new IntersectionObserver(([e]) => e.isIntersecting && setIdle(true), { rootMargin: "1200px 0px" });
      io.observe(el);
      return () => io.disconnect();
    }
    const wait = typeof eager === "number" ? eager : 0;
    let h = 0;
    const t = setTimeout(() => {
      if (typeof requestIdleCallback === "undefined") setIdle(true);
      else h = requestIdleCallback(() => setIdle(true), { timeout: 1500 });
    }, wait || 200);
    return () => {
      clearTimeout(t);
      if (h) cancelIdleCallback(h);
    };
  }, [eager]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin: "200px 0px" },
    );
    const ahead = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px" });
    const range = new IntersectionObserver(([e]) => setInRange(e.isIntersecting), { rootMargin: "150% 0px" });
    io.observe(el);
    ahead.observe(el);
    range.observe(el);
    return () => {
      io.disconnect();
      ahead.disconnect();
      range.disconnect();
    };
  }, []);

  const use3d = !!ok && !reduce;
  // Until WebGL and motion preferences are known (the server render), assume 3D is coming.
  const fallback = ok === false || reduce === true;
  // Preloaded scenes stay until they've been seen; after that, only while within range
  const mounted = use3d && (inRange || !seen) && (near || visible || idle || ready);
  if (!mounted && ready) setReady(false);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn("absolute inset-0 transition-opacity duration-700", use3d && ready ? "pointer-events-none opacity-0" : "opacity-100")}
        aria-hidden={use3d && ready}
      >
        {fallback ? poster : placeholder}
      </div>
      {mounted && (
        <div
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[var(--ease-out-expo)]",
            ready ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
          )}
        >
          {children({ active: visible, onReady: () => setReady(true) })}
        </div>
      )}
    </div>
  );
}
