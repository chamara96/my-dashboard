import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useFinancialGoals } from "../../hooks/useFinancialGoals";
import {
  deleteSnapshot,
  deleteRecurringEntry,
  deleteOneTimeEntry,
} from "../../services/financialGoalService";
import {
  FinancialSnapshot,
  OneTimeEntry,
  RecurringEntry,
} from "../../types/goals";
import { computeProjection, getLatestSnapshot } from "../../utils/goalProjection";
import ProjectionChart from "../../components/goals/ProjectionChart";
import SnapshotForm from "../../components/goals/SnapshotForm";
import RecurringEntryForm from "../../components/goals/RecurringEntryForm";
import OneTimeEntryForm from "../../components/goals/OneTimeEntryForm";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Projection horizon options ────────────────────────────────────────────────

const HORIZON_OPTIONS: { label: string; months: number }[] = [
  { label: "3 mo", months: 3 },
  { label: "6 mo", months: 6 },
  { label: "12 mo", months: 12 },
  { label: "24 mo", months: 24 },
];

// ── Delete confirmation state shape ──────────────────────────────────────────

type DeleteTarget =
  | { type: "snapshot"; id: string }
  | { type: "recurring"; id: string }
  | { type: "oneTime"; id: string };

// ── Shared style tokens ───────────────────────────────────────────────────────

const cardCls =
  "rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6";
const thCls =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const tdCls = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";
const actionBtn = "text-xs px-2 py-1 rounded-md transition";
const editBtnCls = `${actionBtn} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-1`;
const deleteBtnCls = `${actionBtn} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400`;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
      >
        {message}
      </td>
    </tr>
  );
}

function TypeBadge({ type }: { type: "income" | "expense" }) {
  return type === "income" ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Income
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Expense
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FinancialGoalPage() {
  const { snapshots, recurring, oneTime, loading, error } = useFinancialGoals();

  // ── Projection horizon ────────────────────────────────────────────────────
  const [horizonMonths, setHorizonMonths] = useState(6);

  // ── Modal state ───────────────────────────────────────────────────────────
  const snapshotModal  = useModal();
  const recurringModal = useModal();
  const oneTimeModal   = useModal();

  const [editingSnapshot,  setEditingSnapshot]  = useState<FinancialSnapshot | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringEntry | null>(null);
  const [editingOneTime,   setEditingOneTime]   = useState<OneTimeEntry | null>(null);
  const [confirmDelete,    setConfirmDelete]    = useState<DeleteTarget | null>(null);

  // ── Projection computation ────────────────────────────────────────────────
  const projection = useMemo(
    () => computeProjection(snapshots, recurring, oneTime, horizonMonths),
    [snapshots, recurring, oneTime, horizonMonths]
  );

  const latestSnapshot = useMemo(() => getLatestSnapshot(snapshots), [snapshots]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const monthlyIncome   = useMemo(
    () => recurring.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
    [recurring]
  );
  const monthlyExpenses = useMemo(
    () => recurring.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
    [recurring]
  );
  const monthlySavings = monthlyIncome - monthlyExpenses;

  const projectedFinal = projection.length > 0 ? projection[projection.length - 1].closingBalance : null;

  // ── Modal open/close helpers ──────────────────────────────────────────────
  const openNewSnapshot  = () => { setEditingSnapshot(null);  snapshotModal.openModal(); };
  const openEditSnapshot = (s: FinancialSnapshot) => { setEditingSnapshot(s); snapshotModal.openModal(); };
  const closeSnapshot    = () => { setEditingSnapshot(null);  snapshotModal.closeModal(); };

  const openNewRecurring  = () => { setEditingRecurring(null);  recurringModal.openModal(); };
  const openEditRecurring = (r: RecurringEntry) => { setEditingRecurring(r); recurringModal.openModal(); };
  const closeRecurring    = () => { setEditingRecurring(null);  recurringModal.closeModal(); };

  const openNewOneTime  = () => { setEditingOneTime(null);   oneTimeModal.openModal(); };
  const openEditOneTime = (e: OneTimeEntry) => { setEditingOneTime(e); oneTimeModal.openModal(); };
  const closeOneTime    = () => { setEditingOneTime(null);   oneTimeModal.closeModal(); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "snapshot")  await deleteSnapshot(confirmDelete.id);
    if (confirmDelete.type === "recurring") await deleteRecurringEntry(confirmDelete.id);
    if (confirmDelete.type === "oneTime")   await deleteOneTimeEntry(confirmDelete.id);
    setConfirmDelete(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title="Financial Goal Planner"
        description="Project your future financial balance based on recurring and one-time cash flows"
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* ── Summary KPI strip ─────────────────────────────────────────── */}
        <div className="col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Current Balance",
              value: latestSnapshot ? fmt(latestSnapshot.balance) : "—",
              sub: latestSnapshot ? latestSnapshot.date : "No snapshot yet",
              color: "text-gray-900 dark:text-white",
            },
            {
              label: "Monthly Income",
              value: fmt(monthlyIncome),
              sub: `${recurring.filter((r) => r.type === "income").length} recurring`,
              color: "text-green-600 dark:text-green-400",
            },
            {
              label: "Monthly Expenses",
              value: fmt(monthlyExpenses),
              sub: `${recurring.filter((r) => r.type === "expense").length} recurring`,
              color: "text-red-500 dark:text-red-400",
            },
            {
              label: `Balance in ${horizonMonths} mo`,
              value: projectedFinal !== null ? fmt(projectedFinal) : "—",
              sub: monthlySavings >= 0
                ? `+${fmt(monthlySavings)} / mo net`
                : `${fmt(monthlySavings)} / mo net`,
              color:
                projectedFinal === null
                  ? "text-gray-900 dark:text-white"
                  : projectedFinal >= (latestSnapshot?.balance ?? 0)
                  ? "text-brand-500"
                  : "text-red-500 dark:text-red-400",
            },
          ].map((card) => (
            <div key={card.label} className={cardCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                {card.label}
              </p>
              <p className={`text-xl font-bold truncate ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Projection Chart ──────────────────────────────────────────── */}
        <div className="col-span-12">
          <div className={cardCls}>
            <SectionHeader
              title="Cash Flow Projection"
              subtitle="Projected closing balance, income, and expenses by month"
            >
              {/* Horizon selector */}
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {HORIZON_OPTIONS.map((opt) => (
                  <button
                    key={opt.months}
                    onClick={() => setHorizonMonths(opt.months)}
                    className={`px-3 py-1.5 text-xs font-medium transition ${
                      horizonMonths === opt.months
                        ? "bg-brand-500 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SectionHeader>

            {loading ? (
              <p className="text-sm text-gray-400 py-10 text-center">Loading…</p>
            ) : (
              <ProjectionChart data={projection} />
            )}
          </div>
        </div>

        {/* ── Balance Snapshots ─────────────────────────────────────────── */}
        <div className="col-span-12 xl:col-span-5">
          <div className={`${cardCls} h-full`}>
            <SectionHeader
              title="Balance Snapshots"
              subtitle="Record your actual balance on a given date"
            >
              <Button size="sm" onClick={openNewSnapshot}>+ New Snapshot</Button>
            </SectionHeader>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[360px]">
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th className={thCls}>Date</th>
                        <th className={thCls}>Balance</th>
                        <th className={thCls}>Currency</th>
                        <th className={thCls}>Note</th>
                        <th className={thCls}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td>
                        </tr>
                      ) : snapshots.length === 0 ? (
                        <EmptyRow cols={5} message="No snapshots yet. Add your current balance to start." />
                      ) : (
                        snapshots.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className={`${tdCls} whitespace-nowrap font-medium`}>{s.date}</td>
                            <td className={`${tdCls} font-semibold text-gray-900 dark:text-white`}>
                              {fmt(s.balance)}
                            </td>
                            <td className={tdCls}>{s.currency}</td>
                            <td className={`${tdCls} max-w-[100px] truncate`} title={s.note}>{s.note}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>
                              <button onClick={() => openEditSnapshot(s)} className={editBtnCls}>Edit</button>
                              <button
                                onClick={() => setConfirmDelete({ type: "snapshot", id: s.id })}
                                className={deleteBtnCls}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── One-Time Entries ──────────────────────────────────────────── */}
        <div className="col-span-12 xl:col-span-7">
          <div className={`${cardCls} h-full`}>
            <SectionHeader
              title="One-Time Entries"
              subtitle="Single income or expense on a specific date"
            >
              <Button size="sm" onClick={openNewOneTime}>+ Add One-Time</Button>
            </SectionHeader>

            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[560px]">
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th className={thCls}>Date</th>
                        <th className={thCls}>Label</th>
                        <th className={thCls}>Type</th>
                        <th className={thCls}>Amount</th>
                        <th className={thCls}>Currency</th>
                        <th className={thCls}>Note</th>
                        <th className={thCls}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td>
                        </tr>
                      ) : oneTime.length === 0 ? (
                        <EmptyRow cols={7} message="No one-time entries yet." />
                      ) : (
                        oneTime.map((e) => (
                          <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className={`${tdCls} whitespace-nowrap`}>{e.date}</td>
                            <td className={`${tdCls} font-medium text-gray-900 dark:text-white`}>{e.label}</td>
                            <td className={tdCls}><TypeBadge type={e.type} /></td>
                            <td className={`${tdCls} font-semibold ${e.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                              {fmt(e.amount)}
                            </td>
                            <td className={tdCls}>{e.currency}</td>
                            <td className={`${tdCls} max-w-[120px] truncate`} title={e.note}>{e.note}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>
                              <button onClick={() => openEditOneTime(e)} className={editBtnCls}>Edit</button>
                              <button
                                onClick={() => setConfirmDelete({ type: "oneTime", id: e.id })}
                                className={deleteBtnCls}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recurring Entries ─────────────────────────────────────────── */}
        <div className="col-span-12">
          <div className={cardCls}>
            <SectionHeader
              title="Recurring Monthly Entries"
              subtitle="Fixed income and expenses that repeat every month"
            >
              <Button size="sm" onClick={openNewRecurring}>+ Add Recurring</Button>
            </SectionHeader>

            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[800px] xl:min-w-full">
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th className={thCls}>Label</th>
                        <th className={thCls}>Type</th>
                        <th className={thCls}>Amount</th>
                        <th className={thCls}>Currency</th>
                        <th className={thCls}>Day</th>
                        <th className={thCls}>Start Date</th>
                        <th className={thCls}>End Date</th>
                        <th className={thCls}>Note</th>
                        <th className={thCls}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td>
                        </tr>
                      ) : recurring.length === 0 ? (
                        <EmptyRow cols={9} message="No recurring entries yet. Add your salary, rent, subscriptions, etc." />
                      ) : (
                        recurring.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className={`${tdCls} font-medium text-gray-900 dark:text-white`}>{r.label}</td>
                            <td className={tdCls}><TypeBadge type={r.type} /></td>
                            <td className={`${tdCls} font-semibold ${r.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                              {fmt(r.amount)}
                            </td>
                            <td className={tdCls}>{r.currency}</td>
                            <td className={tdCls}>{r.dayOfMonth}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>{r.startDate}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>{r.endDate ?? "—"}</td>
                            <td className={`${tdCls} max-w-[140px] truncate`} title={r.note}>{r.note}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>
                              <button onClick={() => openEditRecurring(r)} className={editBtnCls}>Edit</button>
                              <button
                                onClick={() => setConfirmDelete({ type: "recurring", id: r.id })}
                                className={deleteBtnCls}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recurring totals footer */}
            {!loading && recurring.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Monthly total income:{" "}
                  <strong className="text-green-600 dark:text-green-400">{fmt(monthlyIncome)}</strong>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Monthly total expenses:{" "}
                  <strong className="text-red-500 dark:text-red-400">{fmt(monthlyExpenses)}</strong>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Net monthly savings:{" "}
                  <strong className={monthlySavings >= 0 ? "text-brand-500" : "text-red-500 dark:text-red-400"}>
                    {monthlySavings >= 0 ? "+" : ""}{fmt(monthlySavings)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <SnapshotForm
        isOpen={snapshotModal.isOpen}
        onClose={closeSnapshot}
        editing={editingSnapshot}
      />
      <RecurringEntryForm
        isOpen={recurringModal.isOpen}
        onClose={closeRecurring}
        editing={editingRecurring}
      />
      <OneTimeEntryForm
        isOpen={oneTimeModal.isOpen}
        onClose={closeOneTime}
        editing={editingOneTime}
      />

      {/* Confirm delete */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        className="max-w-sm p-6 sm:p-8"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
          Confirm Delete
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Are you sure you want to delete this{" "}
          {confirmDelete?.type === "snapshot"
            ? "snapshot"
            : confirmDelete?.type === "recurring"
            ? "recurring entry"
            : "one-time entry"}
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
