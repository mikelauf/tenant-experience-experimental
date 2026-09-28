"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { CloseBand } from "@/components/member/home/SignInClose";

/** The venues home's last word: the tower with every venue lit and named, each name opening its page. */
export function VenuesClose() {
  const t = useTenant();
  const router = useRouter();
  const floors = useMemo(
    () => [...t.venues].sort((a, b) => b.level - a.level).map((v) => ({ id: v.slug, name: v.name, level: v.level, where: v.levelLabel })),
    [t.venues],
  );
  return (
    <CloseBand
      meta={`An event at ${t.copy.the}?`}
      title="Come on up."
      lead="Tell us what you have in mind. Our events team will help you plan it."
      floors={floors}
      onPick={(slug) => router.push(`/venues/${slug}`)}
      actions={
        <ButtonLink href="/venues/inquire" variant="light" size="lg" icon="arrow-right">
          Submit an inquiry
        </ButtonLink>
      }
    />
  );
}
