import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { Currency } from "../../types/income";
import { EntryType, RecurringEntry } from "../../types/goals";
import {
  addRecurringEntry,
  updateRecurringEntry,
} from "../../services/financialGoalService";

const CURRENCIES: Currency[] = ["LKR", "EURO"];
const ENTRY_TYPES: EntryType[] = ["income", "expense"];
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing?: RecurringEntry | null;
}

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = (): Omit<RecurringEntry, "id"> => ({
  label: "",
  type: "expense",
  amount: 0,
  currency: "LKR",
  dayOfMonth: 1,
  startDate: today(),
  endDate: "",
  note: "",
});

export default function RecurringEntryForm({ isOpen, onClose, editing }: Props) {
  const [form, setForm] = useState<Omit<RecurringEntry, "id">>(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      setForm({ ...rest, endDate: rest.endDate ?? "" });
    } else {
      setForm(EMPTY());
    }
    setError(null);
  }, [editing, isOpen]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { setError("Label is required."); return; }
    if (form.amount <= 0)   { setError("Amount must be greater than 0."); return; }
    setSaving(true);
    try {
      // Firebase RTDB rejects undefined — omit endDate entirely when empty
      const { endDate, ...rest } = form;
      const payload = endDate ? { ...rest, endDate } : rest;
      if (editing) {
        await updateRecurringEntry(editing.id, payload);
      } else {
        await addRecurringEntry(payload);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
        {editing ? "Edit Recurring Entry" : "Add Recurring Entry"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Label + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Label *</label>
            <input
              className={inputCls}
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Salary, Rent, Loan EMI"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => set("type", e.target.value as EntryType)}
            >
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputCls}
              value={form.amount}
              onChange={(e) => set("amount", Number(e.target.value))}
              required
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

        {/* Day of month */}
        <div>
          <label className={labelCls}>Day of Month *</label>
          <select
            className={inputCls}
            value={form.dayOfMonth}
            onChange={(e) => set("dayOfMonth", Number(e.target.value))}
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            The day of each month this entry occurs (max 28 to avoid month-end issues).
          </p>
        </div>

        {/* Start / End dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>End Date <span className="text-gray-400">(optional)</span></label>
            <input
              type="date"
              className={inputCls}
              value={form.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
        </div>

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
            {saving ? "Saving…" : editing ? "Update" : "Add Entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
