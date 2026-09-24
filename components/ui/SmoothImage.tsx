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
 */
export default function SmoothImage({ onLoad, src, style, quality = 85, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const preview = typeof src === "string" ? blur[src] : undefined;

  // Cached images can finish before hydration; catch them on mount.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      {preview && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 scale-110 bg-cover blur-xl transition-opacity duration-300",
            loaded ? "opacity-0 delay-[900ms]" : "opacity-100",
          )}
          style={{ backgroundImage: `url(${preview})`, backgroundPosition: (style?.objectPosition as string | undefined) ?? "center" }}
        />
      )}
      <span
        className={cn(
          "absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-out-quart)] motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
        )}
      >
        <NextImage
          ref={ref}
          src={src}
          style={style}
          quality={quality}
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
