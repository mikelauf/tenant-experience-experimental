import { InquiryForm } from "@/components/public/InquiryForm";
import { LineReveal } from "@/components/motion/Reveal";

export const metadata = { title: "Start an inquiry" };

export default async function InquirePage({ searchParams }: PageProps<"/venues/inquire">) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);

  return (
    <div className="frame pb-24 pt-[calc(var(--nav-h)+40px)] lg:pb-36">
      <div className="grid-12 mb-12 gap-y-4 lg:mb-16">
        <LineReveal as="h1" className="t-hero col-span-12 lg:col-span-8" lines={["Tell us about", "your event."]} />
        <p className="t-lead col-span-12 max-w-[40ch] self-end text-stone lg:col-span-4">
          Five minutes, no account. A person replies, and nothing is reserved until you say so.
        </p>
      </div>
      <InquiryForm initial={{ venue: one("venue"), guests: one("guests"), date: one("date") }} />
    </div>
  );
}
