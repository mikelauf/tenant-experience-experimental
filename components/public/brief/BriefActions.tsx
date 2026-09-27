"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Share, print, and the way into an inquiry. Hidden when printing: the paper is the brief. */
export function BriefActions({ inquireHref, className }: { inquireHref: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Dismissed, or no clipboard: nothing to undo
    }
  };
  const ghost = "inline-flex h-11 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium shadow-[var(--shadow-ring)] transition-colors hover:bg-fog";

  return (
    <div className={cn("flex flex-wrap items-center gap-2 print:hidden", className)}>
      <button onClick={share} className={ghost}>
        <Icon name={copied ? "check" : "share"} size={18} />
        <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
      </button>
      <button onClick={() => window.print()} className={ghost}>
        <Icon name="print" size={18} />
        Print or save PDF
      </button>
      <ButtonLink href={inquireHref} variant="accent" icon="arrow-right">
        Start an inquiry
      </ButtonLink>
    </div>
  );
}
