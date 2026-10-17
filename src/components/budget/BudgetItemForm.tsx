import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { Currency } from "../../types/income";
import { BudgetItem, BudgetStatus } from "../../types/budget";
import { addBudgetItem, updateBudgetItem } from "../../services/budgetService";

const CURRENCIES: Currency[] = ["LKR", "EURO"];
const STATUSES: { value: BudgetStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing?: BudgetItem | null;
}

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = (): Omit<BudgetItem, "id"> => ({
  name: "",
  note: "",
  estimatedCost: 0,
  currency: "LKR",
  status: "planned",
  createdAt: today(),
});

export default function BudgetItemForm({ isOpen, onClose, editing }: Props) {
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      setForm(rest);
    } else {
      setForm(EMPTY());
    }
    setError(null);
  }, [editing, isOpen]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.estimatedCost < 0) {
      setError("Estimated cost cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editing) {
        await updateBudgetItem(editing.id, payload);
      } else {
        await addBudgetItem(payload);
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
        {editing ? "Edit budget item" : "New budget item"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        A main item such as a land purchase or a house plan, with an estimated total.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input
            className={inputCls}
            value={form.name}
            placeholder="e.g. Land purchase, House plan design"
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Estimated cost</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputCls}
              value={form.estimatedCost}
              onChange={(e) => set("estimatedCost", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select
              className={inputCls}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => set("status", e.target.value as BudgetStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Started</label>
            <input
              type="date"
              className={inputCls}
              value={form.createdAt}
              onChange={(e) => set("createdAt", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Note</label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.note}
            placeholder="Optional details about this item"
            onChange={(e) => set("note", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Add item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
