"use client";

import { useEffect, useState } from "react";

/**
 * Which of these elements is being read: the last one whose top has passed `line` (a fraction of the screen's
 * height, a third of the way down by default). Before the first one arrives, it's the first.
 */
export function useScrollSpy(ids: string[], line = 0.35) {
  const key = ids.join(",");
  const [active, setActive] = useState<string | undefined>(ids[0]);
  useEffect(() => {
    const els = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    let raf = 0;
    const pick = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.innerHeight * line;
        let at = els[0]!;
        for (const el of els) if (el.getBoundingClientRect().top <= y) at = el;
        setActive(at.id);
      });
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [key, line]);
  return active;
}

/** Glide to an element with the page's smooth scroll when it's running, else the browser's own */
export function glideTo(el: HTMLElement) {
  const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -offset });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}
