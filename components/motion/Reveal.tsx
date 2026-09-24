"use client";

import { motion, type HTMLMotionProps } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Short, calm upward fade. */
export function Reveal({ delay = 0, y = 18, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.9, ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Splits a headline into lines that rise out of a mask, one after another. */
export function LineReveal({ lines, className, as = "h2", delay = 0 }: { lines: string[]; className?: string; as?: "h1" | "h2" | "h3" | "p"; delay?: number }) {
  const Tag = motion[as];
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10% 0px" }}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block"
            variants={{
              hidden: { y: "105%" },
              show: { y: 0, transition: { duration: 1, ease, delay: delay + i * 0.08 } },
            }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Image wrapper that unmasks from the bottom with a slight settle-in scale. */
export function ClipReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(14% 0% 0% 0% round 22px)", opacity: 0.4 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 22px)", opacity: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.2, ease, delay }}
    >
      <motion.div
        className="relative h-full w-full"
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.6, ease, delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
