import type {
  SalaryAmounts,
  SalaryContributions,
  SalaryDeductions,
} from "../types/income";

/** Employee share of EPF, deducted from take-home. */
export const EPF_EMPLOYEE_RATE = 0.08;
/** Employer share of EPF. Paid by the company, not deducted from salary. */
export const EPF_EMPLOYER_RATE = 0.12;
/** Employer ETF. Paid by the company, not deducted from salary. */
export const ETF_RATE = 0.03;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Fields that may still use the old single EPF / ETF-as-deduction shape. */
type LegacyDeductions = {
  etf?: number;
  epf?: number;
  epfEmployee?: number;
  tax?: number;
};

type LegacyContributions = {
  etf?: number;
  epfEmployer?: number;
};

type RawPay = {
  deductions?: LegacyDeductions;
  contributions?: LegacyContributions;
};

/**
 * Map stored salary pay fields onto the current shape.
 * Older records kept ETF inside deductions and had only the employee EPF.
 * When company EPF was never saved, it is inferred as 12/8 of the employee amount.
 */
export function normalizeSalaryPay<T extends object>(
  raw: T & RawPay
): Omit<T, "deductions" | "contributions"> & {
  deductions: SalaryDeductions;
  contributions: SalaryContributions;
} {
  const { deductions: dRaw, contributions: cRaw, ...rest } = raw;
  const d = (dRaw ?? {}) as LegacyDeductions;
  const c = (cRaw ?? {}) as LegacyContributions;
  const epfEmployee = num(d.epfEmployee ?? d.epf);
  const hasContributions = cRaw != null;

  return {
    ...rest,
    deductions: {
      epfEmployee,
      tax: num(d.tax),
    },
    contributions: {
      etf: num(c.etf ?? d.etf),
      epfEmployer: hasContributions
        ? num(c.epfEmployer)
        : roundMoney(epfEmployee * (EPF_EMPLOYER_RATE / EPF_EMPLOYEE_RATE)),
    },
  };
}

export function grossOf(amounts: SalaryAmounts): number {
  return num(amounts?.basic) + num(amounts?.fix) + num(amounts?.variable);
}

/** Take-home deducts employee EPF and tax only. Company ETF and EPF stay out. */
export function takeHomeOf(amounts: SalaryAmounts, deductions: SalaryDeductions): number {
  return grossOf(amounts) - num(deductions?.epfEmployee) - num(deductions?.tax);
}

export function statutoryFromBasic(basic: number): {
  epfEmployee: number;
  contributions: SalaryContributions;
} {
  const base = num(basic);
  return {
    epfEmployee: roundMoney(base * EPF_EMPLOYEE_RATE),
    contributions: {
      epfEmployer: roundMoney(base * EPF_EMPLOYER_RATE),
      etf: roundMoney(base * ETF_RATE),
    },
  };
}
