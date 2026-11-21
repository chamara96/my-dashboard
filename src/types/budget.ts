import { Currency } from "./income";

export type BudgetStatus = "planned" | "in_progress" | "completed";

/**
 * A budgeted item — a land purchase, a house plan, or any other cost
 * that has an estimated total and a list of dated entries underneath.
 */
export interface BudgetItem {
  id: string;
  name: string;
  note: string;
  estimatedCost: number;
  currency: Currency;
  status: BudgetStatus;
  /** "YYYY-MM-DD" — when the item was started */
  createdAt: string;
}

/**
 * One dated record under a budget item.
 * With an `amount` it is a payment (advance, instalment, legal fees …).
 * Without one it is a general log (application collected, handed over …).
 */
export interface BudgetEntry {
  id: string;
  budgetItemId: string;
  title: string;
  /** Present only for payments; omitted for logs. */
  amount?: number;
  /** "YYYY-MM-DD" */
  date: string;
  note: string;
}
