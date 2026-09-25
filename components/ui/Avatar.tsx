import { cn } from "@/lib/cn";
import type { Person } from "@/lib/data/types";
import Image from "./SmoothImage";

/** A person's photo, or their initials when there isn't one yet. */
export function Avatar({ p, size, className }: { p: Person; size: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-semibold text-paper", className)}
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {p.image ? (
        <Image src={p.image.src} alt="" fill sizes={`${size}px`} className="object-cover" style={{ objectPosition: p.image.pos ?? "50% 25%" }} />
      ) : (
        p.initials
      )}
    </span>
  );
}
