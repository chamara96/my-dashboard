export type Currency = "LKR" | "EURO";

export type FamilyUser = "User 1" | "User 2";

// ─── Salary ─────────────────────────────────────────────────────────────────

export interface SalaryAmounts {
  basic: number;
  fix: number;
  variable: number;
}

export interface SalaryDeductions {
  etf: number;
  epf: number;
  tax: number;
}

/** A reusable monthly template. Holds the stable fields so the user only
 *  overrides the date (and optional note) each month. */
export interface SalaryTemplate {
  id: string;
  name: string;
  user: FamilyUser;
  source: string;
  amounts: SalaryAmounts;
  currency: Currency;
  deductions: SalaryDeductions;
  note: string;
}

/** An actual income record for a given month. May be created from a template. */
export interface SalaryRecord {
  id: string;
  templateId?: string;
  user: FamilyUser;
  date: string;       // ISO date string, e.g. "2026-08-01"
  source: string;
  amounts: SalaryAmounts;
  currency: Currency;
  deductions: SalaryDeductions;
  note: string;
}

// ─── Other Income ────────────────────────────────────────────────────────────

export interface OtherIncome {
  id: string;
  user: FamilyUser;
  date: string;
  amount: number;
  currency: Currency;
  note: string;
}
