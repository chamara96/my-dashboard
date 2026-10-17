import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { BudgetItem, BudgetPayment } from "../../types/budget";
import {
  addBudgetPayment,
  updateBudgetPayment,
} from "../../services/budgetService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: BudgetItem | null;
  editing?: BudgetPayment | null;
}

const today = () => new Date().toISOString().split("T")[0];

export default function BudgetPaymentForm({
  isOpen,
  onClose,
  item,
  editing,
}: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setLabel(editing.label);
      setAmount(editing.amount);
      setDate(editing.date);
      setNote(editing.note);
    } else {
      setLabel("");
      setAmount(0);
      setDate(today());
      setNote("");
    }
    setError(null);
  }, [editing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!label.trim()) {
      setError("Label is required.");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        budgetItemId: item.id,
        label: label.trim(),
        amount,
        date,
        note: note.trim(),
      };
      if (editing) {
        await updateBudgetPayment(editing.id, payload);
      } else {
        await addBudgetPayment(payload);
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
        {editing ? "Edit payment" : "Add payment"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {item
          ? `Recorded against “${item.name}” in ${item.currency}.`
          : "Select a budget item first."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Label *</label>
          <input
            className={inputCls}
            value={label}
            placeholder="e.g. Advance, 1st instalment, Legal fees"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Note</label>
          <textarea
            rows={2}
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !item}>
            {saving ? "Saving…" : editing ? "Update" : "Add payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
