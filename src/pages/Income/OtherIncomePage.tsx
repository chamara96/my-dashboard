import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import OtherIncomeForm from "../../components/income/OtherIncomeForm";
import { useModal } from "../../hooks/useModal";
import { useOtherIncomes } from "../../hooks/useOtherIncomes";
import { OtherIncome } from "../../types/income";
import { deleteOtherIncome } from "../../services/otherIncomeService";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OtherIncomePage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { incomes, loading, error } = useOtherIncomes();
  const [editing, setEditing] = useState<OtherIncome | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); openModal(); };
  const openEdit = (item: OtherIncome) => { setEditing(item); openModal(); };
  const handleClose = () => { setEditing(null); closeModal(); };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteOtherIncome(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const thCls = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
  const tdCls = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";
  const actionBtn = "text-xs px-2 py-1 rounded-md transition";

  return (
    <>
      <PageMeta title="Other Income" description="Log one-time and other incomes" />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <ComponentCard
            title="Other Income"
            desc="One-time or irregular income entries (freelance, dividends, gifts, etc.)"
          >
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={openNew}>+ Add Income</Button>
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading…</p>
            ) : incomes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                No other income records yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.05]">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th className={thCls}>Date</th>
                      <th className={thCls}>User</th>
                      <th className={thCls}>Amount</th>
                      <th className={thCls}>Currency</th>
                      <th className={thCls}>Note</th>
                      <th className={thCls}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {incomes.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className={`${tdCls} whitespace-nowrap`}>{item.date}</td>
                        <td className={tdCls}>{item.user}</td>
                        <td className={`${tdCls} font-semibold text-green-600 dark:text-green-400`}>
                          {fmt(item.amount)}
                        </td>
                        <td className={tdCls}>{item.currency}</td>
                        <td className={`${tdCls} max-w-[200px] truncate`} title={item.note}>
                          {item.note}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          <button
                            onClick={() => openEdit(item)}
                            className={`${actionBtn} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-1`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className={`${actionBtn} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      </div>

      <OtherIncomeForm isOpen={isOpen} onClose={handleClose} editing={editing} />

      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        className="max-w-sm p-6 sm:p-8"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
          Confirm Delete
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Are you sure you want to delete this income entry? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
        </div>
      </Modal>
    </>
  );
}
