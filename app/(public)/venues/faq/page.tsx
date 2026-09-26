import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenants/server";
import { LineReveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Faq } from "@/components/public/Faq";

export const metadata = { title: "Questions & answers" };

export default async function FaqPage() {
  const t = await getTenant();
  if (!t.copy.public.faq?.length) notFound();

  return (
    <div className="frame pb-24 pt-[calc(var(--nav-h)+40px)] lg:pb-36">
      <div className="grid-12 mb-12 gap-y-4 lg:mb-16">
        <LineReveal as="h1" className="t-hero col-span-12 lg:col-span-8" lines={["Questions,", "answered."]} />
        <p className="t-lead col-span-12 max-w-[40ch] self-end text-stone lg:col-span-4">
          The things organizers ask most about planning an event at {t.copy.the}.
        </p>
      </div>
      <div className="grid-12 gap-y-12">
        <div className="col-span-12 lg:col-span-8">
          <Faq />
        </div>
        <aside className="col-span-12 lg:col-span-3 lg:col-start-10">
          <div className="card sticky top-[calc(var(--nav-h)+20px)] p-6">
            <p className="t-h3">Still have a question?</p>
            <p className="t-small mt-2 text-stone">Put it in your inquiry and the events team will answer it when they follow up.</p>
            <ButtonLink href="/venues/inquire" className="mt-5 w-full" icon="arrow-right">
              Start an inquiry
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
