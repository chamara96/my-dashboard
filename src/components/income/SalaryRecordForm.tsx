import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import {
  Currency,
  IncomeType,
  SalaryRecord,
  SalaryTemplate,
} from "../../types/income";
import {
  addSalaryRecord,
  updateSalaryRecord,
} from "../../services/salaryRecordService";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";

const CURRENCIES: Currency[] = ["LKR", "EURO"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Prefills the form when logging from a template */
  prefillTemplate?: SalaryTemplate | null;
  /** Pass a record to edit an existing entry */
  editing?: SalaryRecord | null;
}

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = (): Omit<SalaryRecord, "id"> => ({
  user: "",
  type: "local",
  date: today(),
  source: "",
  amounts: { basic: 0, fix: 0, variable: 0 },
  currency: "LKR",
  exchangeRate: undefined,
  deductions: { etf: 0, epf: 0, tax: 0 },
  note: "",
});

export default function SalaryRecordForm({
  isOpen,
  onClose,
  prefillTemplate,
  editing,
}: Props) {
  const [form, setForm] = useState<Omit<SalaryRecord, "id">>(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { members } = useFamilyMembers();
  const isForeign = form.type === "foreign";

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      setForm(rest);
    } else if (prefillTemplate) {
      const { id, name: _name, ...rest } = prefillTemplate;
      setForm({ ...rest, date: today(), templateId: id });
    } else {
      setForm(EMPTY());
    }
    setError(null);
  }, [editing, prefillTemplate, isOpen]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleTypeChange = (t: IncomeType) => {
    setForm((f) => ({
      ...f,
      type: t,
      // Zero out fields that are hidden for foreign income
      ...(t === "foreign" && {
        amounts:    { ...f.amounts, fix: 0, variable: 0 },
        deductions: { etf: 0, epf: 0, tax: 0 },
      }),
      // Clear exchange rate when switching back to local
      ...(t === "local" && { exchangeRate: undefined as undefined }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.source.trim()) {
      setError("Source is required.");
      return;
    }
    if (isForeign && (!form.exchangeRate || form.exchangeRate <= 0)) {
      setError("Exchange rate to LKR is required for foreign income.");
      return;
    }
    setSaving(true);
    try {
      // Strip exchangeRate for local records before saving (undefined keys crash Firebase)
      const { exchangeRate, ...rest } = form;
      const payload = isForeign && exchangeRate !== undefined
        ? { ...rest, exchangeRate }
        : rest;
      if (editing) {
        await updateSalaryRecord(editing.id, payload);
      } else {
        await addSalaryRecord(payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white";
  const sectionHdr = "text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 mt-4";

  // LKR equivalent preview for foreign income
  const lkrBasic = isForeign && form.exchangeRate
    ? form.amounts.basic * form.exchangeRate
    : null;

  const title = editing
    ? "Edit Salary Record"
    : prefillTemplate
    ? `Log Record - ${prefillTemplate.name}`
    : "New Salary Record";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">{title}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* User + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>User *</label>
            <select
              className={inputCls}
              value={form.user}
              onChange={(e) => set("user", e.target.value)}
            >
              {members.length === 0 && (
                <option value="">— no members added —</option>
              )}
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.label ? `${m.name} (${m.label})` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
        </div>

        {/* Income Type - radio buttons */}
        <div>
          <label className={labelCls}>Income Type *</label>
          <div className="flex gap-6 mt-1">
            {(["local", "foreign"] as IncomeType[]).map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  name="incomeType"
                  value={t}
                  checked={form.type === t}
                  onChange={() => handleTypeChange(t)}
                  className="w-4 h-4 accent-brand-500 cursor-pointer"
                />
                {t === "local" ? "Local Income" : "Foreign Income"}
              </label>
            ))}
          </div>
        </div>

        {/* Source + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Source (Company) *</label>
            <input
              className={inputCls}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className={labelCls}>Currency *</label>
            <select
              className={inputCls}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Amounts */}
        <p className={sectionHdr}>Amounts</p>
        {isForeign ? (
          <>
            {/* Exchange rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Exchange Rate (1 {form.currency} = ? LKR) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.exchangeRate ?? ""}
                  onChange={(e) =>
                    set("exchangeRate", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  placeholder="e.g. 325.50"
                />
              </div>
              <div>
                <label className={labelCls}>Basic ({form.currency})</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.amounts.basic}
                  onChange={(e) =>
                    set("amounts", { ...form.amounts, basic: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            {/* LKR preview */}
            {lkrBasic !== null && (
              <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 px-4 py-2.5 text-sm">
                <span className="text-gray-500 dark:text-gray-400">LKR equivalent: </span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  Rs.&nbsp;{lkrBasic.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(["basic", "fix", "variable"] as const).map((key) => (
              <div key={key}>
                <label className={labelCls}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.amounts[key]}
                  onChange={(e) =>
                    set("amounts", { ...form.amounts, [key]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Deductions - local only */}
        {!isForeign && (
          <>
            <p className={sectionHdr}>Deductions</p>
            <div className="grid grid-cols-3 gap-3">
              {(["etf", "epf", "tax"] as const).map((key) => (
                <div key={key}>
                  <label className={labelCls}>{key.toUpperCase()}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputCls}
                    value={form.deductions[key]}
                    onChange={(e) =>
                      set("deductions", { ...form.deductions, [key]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Note */}
        <div>
          <label className={labelCls}>Note</label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Log Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
