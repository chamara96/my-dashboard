import { Currency } from "./income";

export type BudgetStatus = "planned" | "in_progress" | "completed";

/**
 * A budgeted item — a land purchase, a house plan, or any other cost
 * that has an estimated total and a list of dated payments underneath.
 */
export interface BudgetItem {
  id: string;
  name: string;
  note: string;
  estimatedCost: number;
  currency: Currency;
  status: BudgetStatus;
  /** "YYYY-MM-DD" — when the item was added */
  createdAt: string;
}

/**
 * A single payment against a budget item
 * (advance, first instalment, legal fees, and so on).
 */
export interface BudgetPayment {
  id: string;
  budgetItemId: string;
  label: string;
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  note: string;
}
