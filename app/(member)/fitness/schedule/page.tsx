import { Suspense } from "react";
import { Schedule } from "@/components/member/fitness/Schedule";

export const metadata = { title: "Class schedule" };

export default function SchedulePage() {
  return (
    <Suspense>
      <Schedule />
    </Suspense>
  );
}
