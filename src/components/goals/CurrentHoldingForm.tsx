import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { Currency } from "../../types/income";
import { CurrentHolding } from "../../types/goals";
import { addCurrentHolding, updateCurrentHolding } from "../../services/currentHoldingsService";

const CURRENCIES: Currency[] = ["LKR", "EURO"];

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  editing?: CurrentHolding | null;
}

const EMPTY = (): Omit<CurrentHolding, "id"> => ({
  label:    "",
  amount:   0,
  currency: "LKR",
  note:     "",
});

export default function CurrentHoldingForm({ isOpen, onClose, editing }: Props) {
  const [form,   setForm]   = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const isForeign = form.currency !== "LKR";

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      setForm({
        label:        rest.label,
        amount:       rest.amount,
        currency:     rest.currency,
        exchangeRate: rest.exchangeRate,
        note:         rest.note ?? "",
      });
    } else {
      setForm(EMPTY());
    }
    setError(null);
  }, [editing, isOpen]);

  const handleCurrencyChange = (c: Currency) => {
    setForm((f) => ({
      ...f,
      currency: c,
      // Clear exchangeRate when switching back to LKR
      ...(c === "LKR" && { exchangeRate: undefined }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { setError("Label is required."); return; }
    if (form.amount < 0)    { setError("Amount cannot be negative."); return; }
    if (isForeign && (!form.exchangeRate || form.exchangeRate <= 0)) {
      setError("Exchange rate to LKR is required for non-LKR holdings.");
      return;
    }
    setSaving(true);
    try {
      // Omit exchangeRate key entirely for LKR holdings
      const { exchangeRate, ...rest } = form;
      const payload: Omit<CurrentHolding, "id"> = isForeign && exchangeRate !== undefined
        ? { ...rest, exchangeRate }
        : rest;

      if (editing) {
        await updateCurrentHolding(editing.id, payload);
      } else {
        await addCurrentHolding(payload);
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

  // Live LKR preview
  const lkrPreview = isForeign && form.exchangeRate && form.exchangeRate > 0
    ? form.amount * form.exchangeRate
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
        {editing ? "Edit Holding" : "Add Holding"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Label */}
        <div>
          <label className={labelCls}>Label *</label>
          <input
            className={inputCls}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Bank A, EUR Wallet, Cash"
          />
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
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className={labelCls}>Currency *</label>
            <select
              className={inputCls}
              value={form.currency}
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Exchange rate — only for non-LKR */}
        {isForeign && (
          <div>
            <label className={labelCls}>
              Exchange Rate (1 {form.currency} = ? LKR) *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputCls}
              value={form.exchangeRate ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  exchangeRate: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
              placeholder="e.g. 325.50"
            />
          </div>
        )}

        {/* LKR preview */}
        {lkrPreview !== null && (
          <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 px-4 py-2.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">LKR value: </span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              Rs.&nbsp;{lkrPreview.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className={labelCls}>Note <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Add Holding"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
