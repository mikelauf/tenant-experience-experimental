"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";

const TOPICS = [
  { id: "all", label: "All" },
  { id: "planning", label: "Planning" },
  { id: "budget", label: "Budget" },
  { id: "services", label: "Services" },
  { id: "visits", label: "Visits & arrival" },
] as const;

/** The building's FAQ as an accordion, with a topic filter and a quick search. */
export function Faq() {
  const faq = useTenant().copy.public.faq ?? [];
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(faq[0]?.q ?? null);
  const q = query.trim().toLowerCase();
  const shown = faq.filter((f) => (topic === "all" || f.tags?.includes(topic)) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Topic" className="no-scrollbar -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] sm:mx-0 sm:px-0">
          {TOPICS.filter((t) => t.id === "all" || faq.some((f) => f.tags?.includes(t.id))).map((t) => (
            <button
              key={t.id}
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-[0.875rem] font-medium transition-colors",
                topic === t.id ? "bg-ink text-paper" : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative sm:w-72">
          <span className="sr-only">Search questions</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" className="field h-11 py-0 pl-4" type="search" />
        </label>
      </div>

      <ul className="mt-8 border-t hairline">
        {shown.map((f) => {
          const on = open === f.q;
          return (
            <li key={f.q} className="border-b hairline">
              <button onClick={() => setOpen(on ? null : f.q)} aria-expanded={on} className="flex w-full items-center justify-between gap-6 py-5 text-left">
                <span className="t-h3">{f.q}</span>
                <Icon name="plus" size={20} className={cn("shrink-0 transition-transform duration-300", on && "rotate-45")} />
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="t-body max-w-[64ch] pb-6 text-ink-2">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
        {!shown.length && <li className="t-body py-8 text-stone">No questions match. Try another word, or ask the events team in an inquiry.</li>}
      </ul>
    </div>
  );
}
