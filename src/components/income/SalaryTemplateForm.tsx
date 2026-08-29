import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import {
  Currency,
  FamilyUser,
  SalaryTemplate,
} from "../../types/income";
import {
  addSalaryTemplate,
  updateSalaryTemplate,
} from "../../services/salaryTemplateService";

const CURRENCIES: Currency[] = ["LKR", "EURO"];
const USERS: FamilyUser[] = ["User 1", "User 2"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing?: SalaryTemplate | null;
}

const EMPTY = (): Omit<SalaryTemplate, "id"> => ({
  name: "",
  user: "User 1",
  source: "",
  amounts: { basic: 0, fix: 0, variable: 0 },
  currency: "LKR",
  deductions: { etf: 0, epf: 0, tax: 0 },
  note: "",
});

export default function SalaryTemplateForm({ isOpen, onClose, editing }: Props) {
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
    if (!form.name.trim() || !form.source.trim()) {
      setError("Template name and source are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateSalaryTemplate(editing.id, form);
      } else {
        await addSalaryTemplate(form);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
        {editing ? "Edit Template" : "New Salary Template"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template name */}
        <div>
          <label className={labelCls}>Template Name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Main Job – User 1"
          />
        </div>

        {/* User + Source */}
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
          <label className={labelCls}>Source (Company) *</label>
          <input
            className={inputCls}
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="Company name"
          />
        </div>

        {/* Amounts */}
        <p className={sectionHdr}>Amounts</p>
        <div className="grid grid-cols-3 gap-3">
          {(["basic", "fix", "variable"] as const).map((key) => (
            <div key={key}>
              <label className={labelCls}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.amounts[key]}
                onChange={(e) =>
                  set("amounts", { ...form.amounts, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
        </div>

        {/* Deductions */}
        <p className={sectionHdr}>Deductions</p>
        <div className="grid grid-cols-3 gap-3">
          {(["etf", "epf", "tax"] as const).map((key) => (
            <div key={key}>
              <label className={labelCls}>{key.toUpperCase()}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.deductions[key]}
                onChange={(e) =>
                  set("deductions", { ...form.deductions, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
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
          <Button variant="outline" onClick={onClose} >Cancel</Button>
          <Button disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Save Template"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
