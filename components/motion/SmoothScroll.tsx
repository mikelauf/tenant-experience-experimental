"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Smooth scroll to a y position, through Lenis when it's running. */
export function scrollToY(y: number) {
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export function SmoothScroll() {
  const path = usePathname();

  // New page, new scroll position (Lenis would otherwise carry the old one over)
  useEffect(() => {
    if (window.location.hash) return;
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, prevent: (node) => !!node.closest?.("[data-lenis-prevent]") });
    window.__lenis = lenis;
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);
  return null;
}
