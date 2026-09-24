"use client";

import { useEffect, useState } from "react";

/** A clock that ticks every `ms` (default 30s). Keeps render pure and countdowns honest. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
