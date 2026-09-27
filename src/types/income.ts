export type Currency = "LKR" | "EURO";

/** Resolved dynamically from the familyMembers DB collection. */
export type FamilyUser = string;

export type IncomeType = "local" | "foreign";

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
  type: IncomeType;
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
  type: IncomeType;
  date: string;       // ISO date string, e.g. "2026-08-01"
  source: string;
  amounts: SalaryAmounts;
  currency: Currency;
  /** Exchange rate to LKR — required when type === "foreign" */
  exchangeRate?: number;
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
