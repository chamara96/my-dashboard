import {
  FinancialSnapshot,
  MonthlyProjection,
  OneTimeEntry,
  RecurringEntry,
} from "../types/goals";

/**
 * Returns "YYYY-MM" for a given year + month (0-indexed month).
 */
function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Returns a human-readable label like "Sep 2026".
 */
function toLabel(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Checks whether a recurring entry is active in the given year/month.
 */
function recurringIsActive(entry: RecurringEntry, year: number, month: number): boolean {
  const ym = toYearMonth(year, month);
  const startYm = entry.startDate.slice(0, 7);
  if (ym < startYm) return false;
  if (entry.endDate && ym > entry.endDate.slice(0, 7)) return false;
  return true;
}

/**
 * Computes projected monthly cash-flow from the most recent snapshot forward.
 *
 * Logic:
 * 1. Pick the most recent snapshot as the opening balance anchor.
 * 2. For each month in [anchorMonth, anchorMonth + projectionMonths):
 *    - Sum all active recurring entries (income adds, expense subtracts).
 *    - Sum all one-time entries whose date falls in this month.
 *    - closingBalance = previousClosing + netCashFlow
 * 3. Months before today are marked isActual=false (still projected, not measured).
 *    Real "actual" data comes from snapshotting your balance each month.
 */
export function computeProjection(
  snapshots: FinancialSnapshot[],
  recurring: RecurringEntry[],
  oneTime: OneTimeEntry[],
  projectionMonths: number
): MonthlyProjection[] {
  if (snapshots.length === 0) return [];

  // Most recent snapshot is the starting anchor
  const sorted = [...snapshots].sort((a, b) => (a.date > b.date ? -1 : 1));
  const anchor = sorted[0];
  const anchorDate = new Date(anchor.date);
  const anchorYear = anchorDate.getFullYear();
  const anchorMonth = anchorDate.getMonth();

  const today = new Date();
  const result: MonthlyProjection[] = [];
  let runningBalance = anchor.balance;

  for (let i = 0; i < projectionMonths; i++) {
    // Advance month-by-month from the anchor
    const totalMonths = anchorMonth + i;
    const year = anchorYear + Math.floor(totalMonths / 12);
    const month = totalMonths % 12;
    const ym = toYearMonth(year, month);

    let totalIncome = 0;
    let totalExpenses = 0;

    // Recurring entries
    for (const entry of recurring) {
      if (!recurringIsActive(entry, year, month)) continue;
      if (entry.type === "income") {
        totalIncome += entry.amount;
      } else {
        totalExpenses += entry.amount;
      }
    }

    // One-time entries in this month
    for (const entry of oneTime) {
      if (entry.date.slice(0, 7) === ym) {
        if (entry.type === "income") {
          totalIncome += entry.amount;
        } else {
          totalExpenses += entry.amount;
        }
      }
    }

    runningBalance = runningBalance + totalIncome - totalExpenses;

    const monthDate = new Date(year, month, 1);
    const isActual = monthDate < new Date(today.getFullYear(), today.getMonth(), 1);

    result.push({
      label: toLabel(year, month),
      yearMonth: ym,
      totalIncome,
      totalExpenses,
      closingBalance: runningBalance,
      isActual,
    });
  }

  return result;
}

/**
 * Given a set of snapshots, returns the one most likely to be "today's balance" —
 * the most recent one on or before today.
 */
export function getLatestSnapshot(
  snapshots: FinancialSnapshot[]
): FinancialSnapshot | null {
  if (snapshots.length === 0) return null;
  const today = new Date().toISOString().split("T")[0];
  const past = snapshots.filter((s) => s.date <= today);
  if (past.length === 0) return snapshots[0];
  return past.reduce((a, b) => (a.date > b.date ? a : b));
}
