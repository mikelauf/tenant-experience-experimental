"use client";

import { MotionConfig } from "motion/react";

/**
 * Respect the OS reduced-motion setting everywhere: transforms and layout
 * animations become instant, fades stay. Components keep one `initial`
 * for server and client, so there's no hydration mismatch.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
