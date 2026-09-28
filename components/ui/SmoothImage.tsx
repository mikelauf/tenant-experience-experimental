"use client";

import NextImage, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";
import { blur } from "@/lib/blur";

/**
 * next/image with a blur-up: a tiny blurred preview paints instantly, then the
 * full photo fades in over it. Only opacity animates on the photo itself (no
 * filters or scaling left behind), so the final image renders pixel-sharp.
 * The fade lives on a wrapper so callers' own hover transforms stay untouched.
 *
 * A `priority` photo (the first screen) skips the fade: it's visible in the server HTML and paints as soon as it
 * arrives, over the preview, without waiting for hydration. That keeps the largest paint early.
 */
export default function SmoothImage({ onLoad, src, style, quality = 85, priority, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  // Once the preview has faded out it leaves the DOM, so a page of photos doesn't keep a blurred layer under each
  const [settled, setSettled] = useState(false);
  const preview = typeof src === "string" ? blur[src] : undefined;

  // Cached images can finish before hydration; catch them on mount.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      {preview && !settled && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 scale-110 bg-cover blur-xl transition-opacity duration-300",
            loaded ? "opacity-0 delay-[900ms]" : "opacity-100",
          )}
          style={{ backgroundImage: `url(${preview})`, backgroundPosition: (style?.objectPosition as string | undefined) ?? "center" }}
          onTransitionEnd={() => loaded && setSettled(true)}
        />
      )}
      <span
        className={cn(
          "absolute inset-0",
          !priority && "transition-opacity duration-[900ms] ease-[var(--ease-out-quart)] motion-reduce:transition-none",
          priority || loaded ? "opacity-100" : "opacity-0",
        )}
      >
        <NextImage
          ref={ref}
          src={src}
          style={style}
          quality={quality}
          // Next 16 retired `priority`: a first-screen photo is fetched eagerly and at high priority instead
          {...(priority && { loading: "eager" as const, fetchPriority: "high" as const })}
          {...props}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
        />
      </span>
    </>
  );
}
