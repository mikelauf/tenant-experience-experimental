import Image from "@/components/ui/SmoothImage";
import { ViewTransition } from "react";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";

/**
 * A photo that fills its box. Give it `vt` to morph between routes
 * (the same name on the card and the detail hero).
 */
export function Photo({
  img,
  className,
  sizes = "100vw",
  priority,
  vt,
  imgClassName,
  quality,
}: {
  img: Img;
  className?: string;
  sizes?: string;
  priority?: boolean;
  vt?: string;
  imgClassName?: string;
  quality?: number;
}) {
  const el = (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={img.src}
        alt={img.alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality ?? 85}
        className={cn("object-cover", imgClassName)}
        style={{ objectPosition: img.pos ?? "50% 50%" }}
      />
    </div>
  );
  if (!vt) return el;
  return (
    <ViewTransition name={vt} share="morph" default="none">
      {el}
    </ViewTransition>
  );
}
