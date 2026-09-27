import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { deleteFamilyMember } from "../../services/familyMemberService";
import FamilyMemberForm from "../../components/settings/FamilyMemberForm";
import { FamilyMember } from "../../types/familyMember";

export default function FamilyMembersPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { members, loading, error } = useFamilyMembers();

  const [editing,       setEditing]       = useState<FamilyMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FamilyMember | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const openAdd = () => { setEditing(null); openModal(); };
  const openEdit = (m: FamilyMember) => { setEditing(m); openModal(); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try { await deleteFamilyMember(confirmDelete.id); }
    finally { setDeleting(false); setConfirmDelete(null); }
  };

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
  const tdCls = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-middle";

  return (
    <>
      <PageMeta title="Family Members" description="Manage family members" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Family Members</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Members listed here appear in all income forms as the "User" selector.
            </p>
          </div>
          <Button onClick={openAdd} size="sm">+ Add Member</Button>
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-500 p-6">{error}</p>
          ) : members.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">No family members added yet.</p>
              <Button onClick={openAdd} size="sm">Add your first member</Button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Label</th>
                  <th className={thCls}>Note</th>
                  <th className={thCls + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-white/[0.01]"}
                  >
                    <td className={tdCls + " font-medium text-gray-800 dark:text-white"}>{m.name}</td>
                    <td className={tdCls}>
                      {m.label
                        ? <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">{m.label}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td className={tdCls + " text-gray-500 dark:text-gray-400 max-w-xs truncate"}>
                      {m.note || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className={tdCls + " text-right"}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-xs px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m)}
                          className="text-xs px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      <FamilyMemberForm
        isOpen={isOpen}
        onClose={closeModal}
        editing={editing}
      />

      {/* Confirm delete */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        className="max-w-sm p-6 sm:p-8"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Confirm Delete</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Are you sure you want to remove <strong>{confirmDelete?.name}</strong>? This won't affect existing income records that reference this name.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            disabled={deleting}
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
