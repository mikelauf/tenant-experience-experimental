"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Something on the page broke: say so plainly, offer to try again, and a way back. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="frame flex min-h-[80svh] flex-col items-start justify-center py-24">
      <h1 className="t-h1 max-w-[18ch]">Something went wrong on this page.</h1>
      <p className="t-lead mt-4 max-w-[40ch] text-stone">It&apos;s on our side, not yours. Try again, or head back to the venues.</p>
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button onClick={() => retry()} className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-medium text-paper transition-colors hover:bg-ink-2">
          Try again
        </button>
        <Link href="/venues" className="font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
          See the venues
        </Link>
      </div>
      {error.digest && <p className="t-meta mt-10">Reference {error.digest}</p>}
    </main>
  );
}
