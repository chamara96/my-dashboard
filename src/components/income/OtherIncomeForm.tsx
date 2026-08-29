import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { Currency, FamilyUser, OtherIncome } from "../../types/income";
import { addOtherIncome, updateOtherIncome } from "../../services/otherIncomeService";

const CURRENCIES: Currency[] = ["LKR", "EURO"];
const USERS: FamilyUser[] = ["User 1", "User 2"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing?: OtherIncome | null;
}

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = (): Omit<OtherIncome, "id"> => ({
  user: "User 1",
  date: today(),
  amount: 0,
  currency: "LKR",
  note: "",
});

export default function OtherIncomeForm({ isOpen, onClose, editing }: Props) {
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
    if (form.amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateOtherIncome(editing.id, form);
      } else {
        await addOtherIncome(form);
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
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
        {editing ? "Edit Other Income" : "New Other Income"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>User *</label>
            <select
              className={inputCls}
              value={form.user}
              onChange={(e) => set("user", e.target.value as FamilyUser)}
            >
              {USERS.map((u) => <option key={u}>{u}</option>)}
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
            {saving ? "Saving…" : editing ? "Update" : "Add Income"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
