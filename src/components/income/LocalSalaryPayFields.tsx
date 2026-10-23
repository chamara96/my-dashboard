import {
  Currency,
  SalaryAmounts,
  SalaryContributions,
  SalaryDeductions,
} from "../../types/income";
import { grossOf, statutoryFromBasic, takeHomeOf } from "../../utils/salaryPay";

interface Props {
  amounts: SalaryAmounts;
  deductions: SalaryDeductions;
  contributions: SalaryContributions;
  currency: Currency;
  onDeductions: (deductions: SalaryDeductions) => void;
  onContributions: (contributions: SalaryContributions) => void;
}

function money(n: number, currency: Currency) {
  const sym = currency === "EURO" ? "€" : "Rs.";
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sym} ${formatted}`;
}

export default function LocalSalaryPayFields({
  amounts,
  deductions,
  contributions,
  currency,
  onDeductions,
  onContributions,
}: Props) {
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white";
  const sectionHdr =
    "text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 mt-4";

  const gross = grossOf(amounts);
  const takeHome = takeHomeOf(amounts, deductions);
  const epfTotal = deductions.epfEmployee + contributions.epfEmployer;

  const fillFromBasic = () => {
    const rates = statutoryFromBasic(amounts.basic);
    onDeductions({ ...deductions, epfEmployee: rates.epfEmployee });
    onContributions(rates.contributions);
  };

  return (
    <>
      <p className={sectionHdr}>Deductions</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        Taken from salary. These reduce take-home.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>EPF (you, 8%)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={deductions.epfEmployee}
            onChange={(e) =>
              onDeductions({ ...deductions, epfEmployee: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className={labelCls}>Tax</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={deductions.tax}
            onChange={(e) =>
              onDeductions({ ...deductions, tax: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <p className={sectionHdr}>Company contributions</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        Paid by the company. ETF and company EPF are not deducted from salary.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>EPF (company, 12%)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={contributions.epfEmployer}
            onChange={(e) =>
              onContributions({ ...contributions, epfEmployer: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className={labelCls}>ETF (company, 3%)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={contributions.etf}
            onChange={(e) =>
              onContributions({ ...contributions, etf: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={fillFromBasic}
        className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        Fill EPF 8% / 12% and ETF 3% from basic
      </button>

      <div className="rounded-lg bg-gray-50 dark:bg-white/[0.04] px-4 py-3 text-sm space-y-1">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">Gross</span>
          <span className="font-medium text-gray-800 dark:text-white">{money(gross, currency)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">Take-home</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {money(takeHome, currency)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">In ETF</span>
          <span className="font-medium text-gray-800 dark:text-white">
            {money(contributions.etf, currency)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">In EPF</span>
          <span className="font-medium text-gray-800 dark:text-white">
            {money(epfTotal, currency)}
          </span>
        </div>
        <p className="text-right text-xs text-gray-400 dark:text-gray-500">
          you {money(deductions.epfEmployee, currency)} · company{" "}
          {money(contributions.epfEmployer, currency)}
        </p>
      </div>
    </>
  );
}
