import { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import SalaryTemplateForm from "../../components/income/SalaryTemplateForm";
import SalaryRecordForm from "../../components/income/SalaryRecordForm";
import { useModal } from "../../hooks/useModal";
import { useSalaryTemplates } from "../../hooks/useSalaryTemplates";
import { useSalaryRecordsPage, PAGE_SIZE } from "../../hooks/useSalaryRecordsPage";
import { useSalaryRecordsSummary } from "../../hooks/useSalaryRecordsSummary";
import { SalaryRecord, SalaryTemplate } from "../../types/income";
import { deleteSalaryTemplate } from "../../services/salaryTemplateService";
import { deleteSalaryRecord } from "../../services/salaryRecordService";
import TableDateFilterTab, { DateFilterOption } from "../../components/common/TableDateFilterTab";
import { CalenderIcon } from "../../icons";
import flatpickr from "flatpickr";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function sym(currency: string) {
  return currency === "EURO" ? "€" : "Rs.";
}
function fmtC(n: number, currency: string) {
  return n === 0 ? "-" : `${sym(currency)} ${fmt(n)}`;
}
/** Convert any amount to LKR using stored exchangeRate (1 if already LKR) */
function toLKR(amount: number, currency: string, exchangeRate?: number): number {
  if (currency === "LKR") return amount;
  return amount * (exchangeRate ?? 0);
}

export default function SalaryIncomePage() {
  const templateModal = useModal();
  const recordModal = useModal();

  const { templates, loading: tLoading, error: tError } = useSalaryTemplates();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DateFilterOption | null>("optionThisMonth");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);

  const toISO = (d: Date) => d.toISOString().split("T")[0];

  const filterRange = useMemo<[string, string] | null>(() => {
    if (customRange) return customRange;
    const now = new Date();
    if (activeTab === "optionThisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [toISO(start), toISO(end)];
    }
    if (activeTab === "optionLastMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0);
      return [toISO(start), toISO(end)];
    }
    if (activeTab === "optionThisYear") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end   = new Date(now.getFullYear(), 11, 31);
      return [toISO(start), toISO(end)];
    }
    // "All" or custom cleared → no range restriction
    return null;
  }, [activeTab, customRange]);

  // ── Summary — own subscription, covers full filter range (never paginated) ─
  const { summary, loading: sLoading } = useSalaryRecordsSummary(
    filterRange?.[0],
    filterRange?.[1]
  );

  // ── DB-level paginated records — only PAGE_SIZE rows fetched per page ─────
  const {
    records: pagedRecords,
    loading:  rLoading,
    error:    rError,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
  } = useSalaryRecordsPage(filterRange?.[0], filterRange?.[1]);

  const [editingTemplate, setEditingTemplate] = useState<SalaryTemplate | null>(null);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [prefillTemplate, setPrefillTemplate] = useState<SalaryTemplate | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<{ type: "template" | "record"; id: string } | null>(null);

  const handleTabSelect = (option: DateFilterOption) => {
    setActiveTab(option);
    setCustomRange(null);
    if (fpRef.current) fpRef.current.clear();
  };

  // ── Flatpickr ─────────────────────────────────────────────────────────────
  const datePickerRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!datePickerRef.current) return;

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "M j, Y",
      altInputClass:
        "h-10 w-10 lg:w-48 lg:h-auto lg:pl-10 lg:pr-3 lg:py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent lg:text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300 cursor-pointer",
      clickOpens: true,
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onChange(selectedDates) {
        if (selectedDates.length === 2) {
          setCustomRange([toISO(selectedDates[0]), toISO(selectedDates[1])]);
          setActiveTab(null);
        }
      },
    });

    fpRef.current = Array.isArray(fp) ? null : fp;

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openNewTemplate = () => { setEditingTemplate(null); templateModal.openModal(); };
  const openEditTemplate = (t: SalaryTemplate) => { setEditingTemplate(t); templateModal.openModal(); };
  const closeTemplateModal = () => { setEditingTemplate(null); templateModal.closeModal(); };

  const openLogFromTemplate = (t: SalaryTemplate) => {
    setEditingRecord(null);
    setPrefillTemplate(t);
    recordModal.openModal();
  };
  const openNewRecord = () => { setEditingRecord(null); setPrefillTemplate(null); recordModal.openModal(); };
  const openEditRecord = (r: SalaryRecord) => { setEditingRecord(r); setPrefillTemplate(null); recordModal.openModal(); };
  const closeRecordModal = () => { setEditingRecord(null); setPrefillTemplate(null); recordModal.closeModal(); };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (confirmDeleteId.type === "template") {
      await deleteSalaryTemplate(confirmDeleteId.id);
    } else {
      await deleteSalaryRecord(confirmDeleteId.id);
    }
    setConfirmDeleteId(null);
  };

  const thCls = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
  const tdCls = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";
  const actionBtn = "text-xs px-2 py-1 rounded-md transition";

  return (
    <>
      <PageMeta title="Salary Income" description="Log and manage salary income records" />

      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* ── Templates ────────────────────────────────────────────── */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            {/* Header */}
            <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
              <div className="w-full">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Statistics
                </h3>
                <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
                  Target you've set for each month
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <Button className="w-max" size="sm" onClick={openNewTemplate}>+ New Template</Button>
              </div>
            </div>
            {/* Table */}
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[1000px] xl:min-w-full">

                {tError && <p className="text-sm text-red-500 mb-3">{tError}</p>}

                {tLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading…</p>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                    No templates yet. Create one to speed up monthly logging.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.05]">
                    <table className="w-full text-left">
                      <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th className={thCls}>Name</th>
                          <th className={thCls}>User</th>
                          <th className={thCls}>Type</th>
                          <th className={thCls}>Source</th>
                          <th className={thCls}>Basic</th>
                          <th className={thCls}>Fix</th>
                          <th className={thCls}>Variable</th>
                          <th className={thCls}>ETF</th>
                          <th className={thCls}>EPF</th>
                          <th className={thCls}>Tax</th>
                          <th className={thCls}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {templates.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className={`${tdCls} font-medium text-gray-900 dark:text-white`}>{t.name}</td>
                            <td className={tdCls}>{t.user}</td>
                            <td className={tdCls}>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.type === "foreign" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                {t.type === "foreign" ? "Foreign" : "Local"}
                              </span>
                            </td>
                            <td className={tdCls}>{t.source}</td>
                            <td className={tdCls}>{fmtC(t.amounts.basic, t.currency)}</td>
                            <td className={tdCls}>{fmtC(t.amounts.fix, t.currency)}</td>
                            <td className={tdCls}>{fmtC(t.amounts.variable, t.currency)}</td>
                            <td className={tdCls}>{fmtC(t.deductions.etf, t.currency)}</td>
                            <td className={tdCls}>{fmtC(t.deductions.epf, t.currency)}</td>
                            <td className={tdCls}>{fmtC(t.deductions.tax, t.currency)}</td>
                            <td className={`${tdCls} whitespace-nowrap`}>
                              <button
                                onClick={() => openLogFromTemplate(t)}
                                className={`${actionBtn} bg-brand-500 text-white hover:bg-brand-600 mr-1`}
                              >
                                Log
                              </button>
                              <button
                                onClick={() => openEditTemplate(t)}
                                className={`${actionBtn} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-1`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId({ type: "template", id: t.id })}
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
                
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary KPIs (LKR, same filter as records) ───────────── */}
        {(sLoading || summary.recordCount > 0) && (
          <div className="col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: "Total Earned",  value: summary.totalEarned, color: "text-gray-900 dark:text-white" },
              { label: "Total ETF",     value: summary.totalETF,    color: "text-gray-600 dark:text-gray-300" },
              { label: "Total EPF",     value: summary.totalEPF,    color: "text-gray-600 dark:text-gray-300" },
              { label: "Total Tax",     value: summary.totalTax,    color: "text-red-500 dark:text-red-400" },
              { label: "Take Home",     value: summary.takeHome,    color: "text-green-600 dark:text-green-400" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                  {card.label}
                </p>
                {sLoading ? (
                  <div className="h-6 w-28 rounded bg-gray-100 dark:bg-gray-700 animate-pulse mt-1" />
                ) : (
                  <p className={`text-lg font-bold truncate ${card.color}`}>
                    Rs.&nbsp;{fmt(card.value)}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  in LKR{sLoading ? "" : ` · ${summary.recordCount} record${summary.recordCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Records ──────────────────────────────────────────────── */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            {/* Header */}
            <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
              <div className="w-full">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Salary Records
                </h3>
                <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
                  Log of actual salary received each month
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <Button className="w-max" size="sm" onClick={openNewRecord}>+ New Record</Button>
                <TableDateFilterTab selected={activeTab} onSelect={handleTabSelect} />
                <div className="relative inline-flex items-center">
                  <CalenderIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 size-5 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
                  <input
                    ref={datePickerRef}
                    className="hidden w-min"
                    placeholder="Select date range"
                    readOnly
                  />
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[1000px] xl:min-w-full">

                  {rError && <p className="text-sm text-red-500 mb-3">{rError}</p>}

                  {rLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading…</p>
                  ) : pagedRecords.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                      No records for the selected period.
                    </p>
                  ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.05]">
                    <table className="w-full text-left">
                      <thead className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th className={thCls}>Date</th>
                          <th className={thCls}>User</th>
                          <th className={thCls}>Type</th>
                          <th className={thCls}>Source</th>
                          <th className={thCls}>Basic</th>
                          <th className={thCls}>Fix</th>
                          <th className={thCls}>Variable</th>
                          <th className={thCls}>Gross</th>
                          <th className={thCls}>ETF</th>
                          <th className={thCls}>EPF</th>
                          <th className={thCls}>Tax</th>
                          <th className={thCls}>Net</th>
                          <th className={thCls}>Net (LKR)</th>
                          <th className={thCls}>Note</th>
                          <th className={thCls}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {pagedRecords.map((r) => {
                          const gross = r.amounts.basic + r.amounts.fix + r.amounts.variable;
                          const totalDed = r.deductions.etf + r.deductions.epf + r.deductions.tax;
                          const net = gross - totalDed;
                          const netLKR = toLKR(net, r.currency, r.exchangeRate);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                              <td className={`${tdCls} whitespace-nowrap`}>{r.date}</td>
                              <td className={tdCls}>{r.user}</td>
                              <td className={tdCls}>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.type === "foreign" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                  {r.type === "foreign" ? "Foreign" : "Local"}
                                </span>
                              </td>
                              <td className={tdCls}>{r.source}</td>
                              <td className={tdCls}>{fmtC(r.amounts.basic, r.currency)}</td>
                              <td className={tdCls}>{fmtC(r.amounts.fix, r.currency)}</td>
                              <td className={tdCls}>{fmtC(r.amounts.variable, r.currency)}</td>
                              <td className={`${tdCls} font-medium`}>{`${sym(r.currency)} ${fmt(gross)}`}</td>
                              <td className={tdCls}>{fmtC(r.deductions.etf, r.currency)}</td>
                              <td className={tdCls}>{fmtC(r.deductions.epf, r.currency)}</td>
                              <td className={tdCls}>{fmtC(r.deductions.tax, r.currency)}</td>
                              <td className={`${tdCls} font-semibold text-green-600 dark:text-green-400`}>{`${sym(r.currency)} ${fmt(net)}`}</td>
                              <td className={`${tdCls} font-semibold ${r.currency === "LKR" ? "text-gray-400 dark:text-gray-500 text-xs" : "text-brand-600 dark:text-brand-400"}`}>
                                {r.currency === "LKR"
                                  ? "—"
                                  : r.exchangeRate
                                  ? `Rs. ${fmt(netLKR)}`
                                  : <span className="text-xs text-gray-400">no rate</span>
                                }
                              </td>
                              <td className={`${tdCls} max-w-[140px] truncate`} title={r.note}>{r.note}</td>
                              <td className={`${tdCls} whitespace-nowrap`}>
                                <button
                                  onClick={() => openEditRecord(r)}
                                  className={`${actionBtn} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-1`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId({ type: "record", id: r.id })}
                                  className={`${actionBtn} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400`}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                
              </div>
            </div>

            {/* ── Pagination ───────────────────────────────────────── */}
            {!rLoading && (hasPrev || hasNext) && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/[0.05] pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {PAGE_SIZE} records per page · fetched from DB
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrev}
                    disabled={!hasPrev}
                    className="px-3 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    ‹ Newer
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!hasNext}
                    className="px-3 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    Older ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>{/* end grid */}

      {/* ── Modals ───────────────────────────────────────────────── */}
      <SalaryTemplateForm
        isOpen={templateModal.isOpen}
        onClose={closeTemplateModal}
        editing={editingTemplate}
      />

      <SalaryRecordForm
        isOpen={recordModal.isOpen}
        onClose={closeRecordModal}
        editing={editingRecord}
        prefillTemplate={prefillTemplate}
      />

      {/* Confirm delete */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        className="max-w-sm p-6 sm:p-8"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Confirm Delete</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Are you sure you want to delete this{" "}
          {confirmDeleteId?.type === "template" ? "template" : "record"}? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
        </div>
      </Modal>
    </>
  );
}
