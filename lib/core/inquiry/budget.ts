/**
 * Budget qualification for public inquiries. The building doesn't publish rates, but every space has a
 * floor below which an event can't work (Transamerica: $10k for event spaces, around $2k for future
 * meeting rooms). Ranges below the floor simply aren't offered, so a lead the team would turn down
 * can't be sent, and no minimum is ever stated.
 *
 * Pure and framework-free, so the form and the tests share it.
 */

/** A budget choice. `max` is the top of the range in dollars; no `max` means "not sure yet". */
export type BudgetOption = { label: string; max?: number };

export const BUDGETS: BudgetOption[] = [
  { label: "Under $10k", max: 9_999 },
  { label: "$10k–$25k", max: 25_000 },
  { label: "$25k–$50k", max: 50_000 },
  { label: "$50k–$100k", max: 100_000 },
  { label: "$100k+", max: Number.POSITIVE_INFINITY },
  { label: "Not sure yet" },
];

/**
 * The ranges worth offering for these spaces: every one whose top reaches the floor, plus "not sure yet".
 * With several spaces the lowest minimum is the floor (if any one of them could work, the lead is worth
 * having). A space without a minimum, or no spaces at all, means no floor.
 */
export function budgetOptions(minimums: readonly (number | undefined)[]): BudgetOption[] {
  const floor = !minimums.length || minimums.some((m) => m === undefined) ? 0 : Math.min(...(minimums as number[]));
  return BUDGETS.filter((b) => b.max === undefined || b.max >= floor);
}
