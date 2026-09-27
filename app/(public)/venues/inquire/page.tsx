import { InquiryForm } from "@/components/public/InquiryForm";

export const metadata = { title: "Start an inquiry" };

export default async function InquirePage({ searchParams }: PageProps<"/venues/inquire">) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);

  return (
    <div className="frame pb-24 pt-[calc(var(--nav-h)+24px)] lg:pb-16">
      <InquiryForm initial={{ venue: one("venue"), guests: one("guests"), date: one("date"), layout: one("layout"), setup: one("setup") }} />
    </div>
  );
}
