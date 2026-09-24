import { Suspense } from "react";
import { InquirySent } from "@/components/public/InquirySent";

export const metadata = { title: "Inquiry received" };

export default function SentPage() {
  return (
    <Suspense>
      <InquirySent />
    </Suspense>
  );
}
