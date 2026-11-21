import { Fragment, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useBudget } from "../../hooks/useBudget";
import { ChevronDownIcon } from "../../icons";
import BudgetItemForm from "../../components/budget/BudgetItemForm";
import BudgetPaymentForm from "../../components/budget/BudgetPaymentForm";
import BudgetLogForm from "../../components/budget/BudgetLogForm";
import {
  deleteBudgetItem,
  deleteBudgetLog,
  deleteBudgetPayment,
} from "../../services/budgetService";
import {
  BudgetItem,
  BudgetLog,
  BudgetPayment,
  BudgetStatus,
} from "../../types/budget";

type TimelineEntry =
  | { kind: "payment"; id: string; date: string; payment: BudgetPayment }
  | { kind: "log"; id: string; date: string; log: BudgetLog };

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function sym(currency: string) {
  return currency === "EURO" ? "€" : "Rs.";
}
function fmtC(n: number, currency: string) {
  return `${sym(currency)} ${fmt(n)}`;
}

const STATUS_META: Record<BudgetStatus, { label: string; cls: string }> = {
  planned: {
    label: "Planned",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
  in_progress: {
    label: "In progress",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

const FILTERS: { value: "all" | BudgetStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

type DeleteTarget =
  | { type: "item"; id: string; name: string }
  | { type: "payment"; id: string; label: string }
  | { type: "log"; id: string; label: string };

const thCls =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const tdCls = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";
const actionBtn = "text-xs px-2 py-1 rounded-md transition";
const editBtnCls = `${actionBtn} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-1`;
const deleteBtnCls = `${actionBtn} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400`;

function StatusBadge({ status }: { status: BudgetStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function ProgressBar({ paid, estimated }: { paid: number; estimated: number }) {
  const ratio = estimated > 0 ? paid / estimated : 0;
  const width = Math.min(ratio * 100, 100);
  const over = estimated > 0 && paid > estimated;
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={`w-10 text-right text-xs tabular-nums ${
          over ? "text-red-500" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {estimated > 0 ? `${Math.round(ratio * 100)}%` : "—"}
      </span>
    </div>
  );
}

function SummaryCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MoneyLines({
  values,
  emphasize,
}: {
  values: Record<string, number>;
  emphasize?: "remaining";
}) {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return (
      <p className="text-xl font-semibold text-gray-800 dark:text-white/90">—</p>
    );
  }
  return (
    <div className="space-y-1">
      {entries.map(([currency, amount]) => {
        const negative = emphasize === "remaining" && amount < 0;
        return (
          <p
            key={currency}
            className={`text-xl font-semibold tabular-nums ${
              negative
                ? "text-red-500"
                : "text-gray-800 dark:text-white/90"
            }`}
          >
            {fmtC(amount, currency)}
          </p>
        );
      })}
    </div>
  );
}

export default function BudgetPage() {
  const { items, payments, logs, loading, error } = useBudget();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | BudgetStatus>("all");

  const itemModal = useModal();
  const paymentModal = useModal();
  const logModal = useModal();
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [paymentItem, setPaymentItem] = useState<BudgetItem | null>(null);
  const [editingPayment, setEditingPayment] = useState<BudgetPayment | null>(null);
  const [logItem, setLogItem] = useState<BudgetItem | null>(null);
  const [editingLog, setEditingLog] = useState<BudgetLog | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Payments and logs merged per item, newest date first.
  // Same-day entries fall back to Firebase push-id order (newest first).
  const timelineByItem = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    const push = (itemId: string, entry: TimelineEntry) => {
      const list = map.get(itemId) ?? [];
      list.push(entry);
      map.set(itemId, list);
    };
    for (const payment of payments) {
      push(payment.budgetItemId, {
        kind: "payment",
        id: payment.id,
        date: payment.date,
        payment,
      });
    }
    for (const log of logs) {
      push(log.budgetItemId, { kind: "log", id: log.id, date: log.date, log });
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
    }
    return map;
  }, [payments, logs]);

  const paidByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of payments) {
      map.set(
        payment.budgetItemId,
        (map.get(payment.budgetItemId) ?? 0) + payment.amount
      );
    }
    return map;
  }, [payments]);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? items
        : items.filter((item) => item.status === statusFilter),
    [items, statusFilter]
  );

  const totals = useMemo(() => {
    const estimated: Record<string, number> = {};
    const paid: Record<string, number> = {};
    for (const item of items) {
      estimated[item.currency] = (estimated[item.currency] ?? 0) + item.estimatedCost;
      paid[item.currency] =
        (paid[item.currency] ?? 0) + (paidByItem.get(item.id) ?? 0);
    }
    const remaining: Record<string, number> = {};
    const currencies = new Set([...Object.keys(estimated), ...Object.keys(paid)]);
    for (const currency of currencies) {
      remaining[currency] = (estimated[currency] ?? 0) - (paid[currency] ?? 0);
    }
    return { estimated, paid, remaining };
  }, [items, paidByItem]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewItem = () => {
    setEditingItem(null);
    itemModal.openModal();
  };
  const openEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    itemModal.openModal();
  };
  const closeItem = () => {
    setEditingItem(null);
    itemModal.closeModal();
  };

  const openNewPayment = (item: BudgetItem) => {
    setPaymentItem(item);
    setEditingPayment(null);
    setExpanded((prev) => ({ ...prev, [item.id]: true }));
    paymentModal.openModal();
  };
  const openEditPayment = (item: BudgetItem, payment: BudgetPayment) => {
    setPaymentItem(item);
    setEditingPayment(payment);
    paymentModal.openModal();
  };
  const closePayment = () => {
    setPaymentItem(null);
    setEditingPayment(null);
    paymentModal.closeModal();
  };

  const openNewLog = (item: BudgetItem) => {
    setLogItem(item);
    setEditingLog(null);
    setExpanded((prev) => ({ ...prev, [item.id]: true }));
    logModal.openModal();
  };
  const openEditLog = (item: BudgetItem, log: BudgetLog) => {
    setLogItem(item);
    setEditingLog(log);
    logModal.openModal();
  };
  const closeLog = () => {
    setLogItem(null);
    setEditingLog(null);
    logModal.closeModal();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "item") {
        await deleteBudgetItem(confirmDelete.id);
      } else if (confirmDelete.type === "payment") {
        await deleteBudgetPayment(confirmDelete.id);
      } else {
        await deleteBudgetLog(confirmDelete.id);
      }
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Budget"
        description="Track estimated costs and dated payments for each budget item"
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <SummaryCard label="Estimated">
            <MoneyLines values={totals.estimated} />
          </SummaryCard>
          <SummaryCard label="Paid">
            <MoneyLines values={totals.paid} />
          </SummaryCard>
          <SummaryCard label="Remaining">
            <MoneyLines values={totals.remaining} emphasize="remaining" />
          </SummaryCard>
        </div>

        <div className="col-span-12">
          <ComponentCard
            title="Budget"
            desc="Add a main item with an estimated cost, then expand it to record payments and general logs by date."
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => {
                  const active = statusFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <Button size="sm" onClick={openNewItem}>
                + Add item
              </Button>
            </div>

            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            {loading ? (
              <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                {items.length === 0
                  ? "No budget items yet. Add a land purchase, a house plan, or any other cost you want to track."
                  : "No items match this filter."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.05]">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <tr>
                      <th className={`${thCls} w-10`} />
                      <th className={thCls}>Item</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Estimated</th>
                      <th className={thCls}>Paid</th>
                      <th className={thCls}>Remaining</th>
                      <th className={thCls}>Progress</th>
                      <th className={thCls}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filtered.map((item) => {
                      const timeline = timelineByItem.get(item.id) ?? [];
                      const paid = paidByItem.get(item.id) ?? 0;
                      const remaining = item.estimatedCost - paid;
                      const isOpen = !!expanded[item.id];
                      return (
                        <Fragment key={item.id}>
                          <tr
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            <td className={tdCls}>
                              <ChevronDownIcon
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </td>
                            <td className={tdCls}>
                              <p className="font-medium text-gray-800 dark:text-white/90">
                                {item.name}
                              </p>
                              {item.note && (
                                <p
                                  className="mt-0.5 max-w-[240px] truncate text-xs text-gray-400"
                                  title={item.note}
                                >
                                  {item.note}
                                </p>
                              )}
                            </td>
                            <td className={tdCls}>
                              <StatusBadge status={item.status} />
                            </td>
                            <td className={`${tdCls} whitespace-nowrap font-medium`}>
                              {item.estimatedCost === 0
                                ? "—"
                                : fmtC(item.estimatedCost, item.currency)}
                            </td>
                            <td
                              className={`${tdCls} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}
                            >
                              {paid === 0 ? "—" : fmtC(paid, item.currency)}
                            </td>
                            <td
                              className={`${tdCls} whitespace-nowrap font-medium ${
                                item.estimatedCost > 0 && remaining < 0
                                  ? "text-red-500"
                                  : ""
                              }`}
                            >
                              {item.estimatedCost === 0
                                ? "—"
                                : fmtC(remaining, item.currency)}
                            </td>
                            <td className={tdCls}>
                              <ProgressBar
                                paid={paid}
                                estimated={item.estimatedCost}
                              />
                            </td>
                            <td
                              className={`${tdCls} whitespace-nowrap`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openNewPayment(item)}
                                className={`${actionBtn} mr-1 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400`}
                              >
                                + Payment
                              </button>
                              <button
                                type="button"
                                onClick={() => openNewLog(item)}
                                className={`${actionBtn} mr-1 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`}
                              >
                                + Log
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditItem(item)}
                                className={editBtnCls}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "item",
                                    id: item.id,
                                    name: item.name,
                                  })
                                }
                                className={deleteBtnCls}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-gray-50/60 dark:bg-white/[0.02]">
                              <td colSpan={8} className="px-4 py-2 sm:pl-14 sm:pr-4">
                                {timeline.length === 0 ? (
                                  <p className="py-2 text-sm text-gray-400 dark:text-gray-500">
                                    No payments or logs yet.
                                  </p>
                                ) : (
                                  <ul>
                                    {timeline.map((entry) => {
                                      const isPayment = entry.kind === "payment";
                                      const title = isPayment
                                        ? entry.payment.label
                                        : entry.log.title;
                                      const note = isPayment
                                        ? entry.payment.note
                                        : entry.log.note;
                                      return (
                                        <li
                                          key={`${entry.kind}-${entry.id}`}
                                          className="flex items-center gap-3 border-t border-gray-100 py-2 first:border-t-0 dark:border-white/[0.05]"
                                        >
                                          <span className="w-[92px] shrink-0 text-xs text-gray-400">
                                            {entry.date}
                                          </span>
                                          <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                                            {title}
                                            {note ? (
                                              <span className="text-gray-400">
                                                {" "}
                                                · {note}
                                              </span>
                                            ) : null}
                                          </span>
                                          <span className="w-[130px] shrink-0 text-right text-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                                            {isPayment
                                              ? fmtC(entry.payment.amount, item.currency)
                                              : ""}
                                          </span>
                                          <span className="shrink-0 whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                isPayment
                                                  ? openEditPayment(item, entry.payment)
                                                  : openEditLog(item, entry.log)
                                              }
                                              className={editBtnCls}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setConfirmDelete({
                                                  type: isPayment ? "payment" : "log",
                                                  id: entry.id,
                                                  label: title,
                                                })
                                              }
                                              className={deleteBtnCls}
                                            >
                                              Delete
                                            </button>
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      </div>

      <BudgetItemForm
        isOpen={itemModal.isOpen}
        onClose={closeItem}
        editing={editingItem}
      />
      <BudgetPaymentForm
        isOpen={paymentModal.isOpen}
        onClose={closePayment}
        item={paymentItem}
        editing={editingPayment}
      />
      <BudgetLogForm
        isOpen={logModal.isOpen}
        onClose={closeLog}
        item={logItem}
        editing={editingLog}
      />

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        className="max-w-sm p-6 sm:p-8"
      >
        <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">
          Confirm delete
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {confirmDelete?.type === "item"
            ? `Delete “${confirmDelete.name}” and every payment and log recorded under it? This cannot be undone.`
            : `Delete the ${confirmDelete?.type === "log" ? "log" : "payment"} “${confirmDelete?.label}”? This cannot be undone.`}
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            disabled={deleting}
            onClick={handleDelete}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
