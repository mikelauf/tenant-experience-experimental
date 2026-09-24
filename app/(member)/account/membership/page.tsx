import { Suspense } from "react";
import { MembershipFlow } from "@/components/member/Account";

export const metadata = { title: "Pyramid Fitness membership" };

export default function MembershipPage() {
  return (
    <Suspense>
      <MembershipFlow />
    </Suspense>
  );
}
