import Link from "next/link";
import { isDemo } from "@/lib/flags";
import { getTenant } from "@/lib/tenants/server";

export const metadata = { title: "Not found" };

/** Any address that isn't a page: the building's name, and the way back to the venues (and, in the demo, the member app). */
export default async function NotFound() {
  const t = await getTenant();
  return (
    <main id="main" className="frame flex min-h-[80svh] flex-col items-start justify-center py-24">
      <p className="t-meta">{t.building.name}</p>
      <h1 className="t-hero mt-4 max-w-[14ch]">This page isn&apos;t here.</h1>
      <p className="t-lead mt-5 max-w-[40ch] text-stone">The link may be old, or the page may have moved. The venues are a good place to start.</p>
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link href="/venues" className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-medium text-paper transition-colors hover:bg-ink-2">
          See the venues
        </Link>
        <Link href="/venues/inquire" className="font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
          Start an inquiry
        </Link>
        {isDemo && (
          <Link href="/home" className="font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            Member home
          </Link>
        )}
      </div>
    </main>
  );
}
