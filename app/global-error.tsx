"use client";

import "./globals.css";

/** The last resort, when even the layout fails: its own page, with the site's type and colors. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="frame flex min-h-svh flex-col items-start justify-center py-24">
          <h1 className="t-h1 max-w-[18ch]">Something went wrong.</h1>
          <p className="t-lead mt-4 max-w-[40ch] text-stone">Try again in a moment.</p>
          <button onClick={() => retry()} className="mt-9 inline-flex h-12 items-center rounded-full bg-ink px-6 font-medium text-paper">
            Try again
          </button>
          {error.digest && <p className="t-meta mt-10">Reference {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
