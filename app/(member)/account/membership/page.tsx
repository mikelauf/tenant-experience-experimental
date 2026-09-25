import { Suspense } from "react";
import { MembershipFlow } from "@/components/member/Account";
import { getTenant } from "@/lib/tenants/server";

export async function generateMetadata() {
  return { title: `${(await getTenant()).fitness?.name ?? "Fitness"} membership` };
}

export default function MembershipPage() {
  return (
    <Suspense>
      <MembershipFlow />
    </Suspense>
  );
}
