"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * True while a full-bleed dark hero (marked with [data-nav-over]) sits under the nav,
 * so the nav can go transparent with light text.
 */
export function useNavOver() {
  const path = usePathname();
  const [over, setOver] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => {
      const hero = document.querySelector<HTMLElement>("[data-nav-over]");
      const y = window.scrollY;
      setScrolled(y > 8);
      if (!hero) return setOver(false);
      const bottom = hero.getBoundingClientRect().bottom;
      setOver(bottom > 72);
    };
    check();
    const t = setTimeout(check, 60);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [path]);

  return { over, scrolled };
}
