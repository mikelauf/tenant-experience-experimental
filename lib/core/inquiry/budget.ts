/**
 * Budget qualification for public inquiries. The building doesn't publish rates, but every space has a
 * floor below which an event can't work (Transamerica: $10k for event spaces, around $2k for future
 * meeting rooms). Before an inquiry is sent, a budget below that floor prompts "is your budget flexible?"
 * rather than becoming a lead the team has to turn down.
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

export const budgetByLabel = (label: string | undefined) => BUDGETS.find((b) => b.label === label);

/**
 * Whether a budget falls below every selected space's minimum. With several spaces the lowest minimum
 * counts: if any one of them could work, the lead is worth having. Spaces without a minimum, and
 * "not sure yet", always pass.
 */
export function budgetCheck(budget: BudgetOption | undefined, minimums: readonly (number | undefined)[]): { ok: true } | { ok: false; floor: number } {
  if (!budget || budget.max === undefined) return { ok: true };
  if (!minimums.length || minimums.some((m) => m === undefined)) return { ok: true };
  const floor = Math.min(...(minimums as number[]));
  return budget.max >= floor ? { ok: true } : { ok: false, floor };
}
