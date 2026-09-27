import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { FamilyMember } from "../../types/familyMember";
import { addFamilyMember, updateFamilyMember } from "../../services/familyMemberService";

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  editing?: FamilyMember | null;
}

const EMPTY = (): Omit<FamilyMember, "id"> => ({ name: "", label: "", note: "" });

export default function FamilyMemberForm({ isOpen, onClose, editing }: Props) {
  const [form,   setForm]   = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      setForm({ name: rest.name, label: rest.label ?? "", note: rest.note ?? "" });
    } else {
      setForm(EMPTY());
    }
    setError(null);
  }, [editing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      const payload: Omit<FamilyMember, "id"> = {
        name: form.name.trim(),
        ...(form.label?.trim() && { label: form.label.trim() }),
        ...(form.note?.trim()  && { note:  form.note.trim() }),
      };
      if (editing) {
        await updateFamilyMember(editing.id, payload);
      } else {
        await addFamilyMember(payload);
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
        {editing ? "Edit Family Member" : "Add Family Member"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Full Name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Chamara"
          />
        </div>

        <div>
          <label className={labelCls}>Short Label <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            className={inputCls}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Me, Wife, Son"
          />
        </div>

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
            {saving ? "Saving…" : editing ? "Update" : "Add Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
