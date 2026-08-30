import { Currency } from "./income";

export type EntryType = "income" | "expense";

/**
 * A point-in-time balance snapshot.
 * Used as the anchor for projections and to track actual vs projected over time.
 */
export interface FinancialSnapshot {
  id: string;
  date: string;      // "YYYY-MM-DD"
  balance: number;
  currency: Currency;
  note: string;
}

/**
 * A recurring monthly item — income or expense that occurs every month
 * on the same day (e.g. salary on the 25th, rent on the 1st).
 */
export interface RecurringEntry {
  id: string;
  label: string;       // e.g. "Salary", "Rent", "Loan EMI"
  type: EntryType;
  amount: number;
  currency: Currency;
  dayOfMonth: number;  // 1–28
  startDate: string;   // "YYYY-MM-DD" — when this entry becomes active
  endDate?: string;    // "YYYY-MM-DD" — optional; entry stops after this date
  note: string;
}

/**
 * A one-time income or expense on a specific date
 * (e.g. bonus, medical bill, car purchase).
 */
export interface OneTimeEntry {
  id: string;
  label: string;
  type: EntryType;
  amount: number;
  currency: Currency;
  date: string;        // "YYYY-MM-DD"
  note: string;
}

// ── Projection output types ──────────────────────────────────────────────────

export interface MonthlyProjection {
  /** e.g. "Sep 2026" */
  label: string;
  /** ISO "YYYY-MM" */
  yearMonth: string;
  totalIncome: number;
  totalExpenses: number;
  /** Ending balance after this month's cash flow */
  closingBalance: number;
  /** true when this month is in the past (before today) */
  isActual: boolean;
}
