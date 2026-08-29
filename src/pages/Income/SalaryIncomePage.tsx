import { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import SalaryTemplateForm from "../../components/income/SalaryTemplateForm";
import SalaryRecordForm from "../../components/income/SalaryRecordForm";
import { useModal } from "../../hooks/useModal";
import { useSalaryTemplates } from "../../hooks/useSalaryTemplates";
import { useSalaryRecords } from "../../hooks/useSalaryRecords";
import { SalaryRecord, SalaryTemplate } from "../../types/income";
import { deleteSalaryTemplate } from "../../services/salaryTemplateService";
import { deleteSalaryRecord } from "../../services/salaryRecordService";
import TableDateFilterTab, { DateFilterOption } from "../../components/common/TableDateFilterTab";
import { CalenderIcon } from "../../icons";
import flatpickr from "flatpickr";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalaryIncomePage() {
  const templateModal = useModal();
  const recordModal = useModal();

  const { templates, loading: tLoading, error: tError } = useSalaryTemplates();

  // ── Filter state (computed before the hook so it drives the DB query) ──────
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
    return null;
  }, [activeTab, customRange]);

  // filterRange drives the Firebase query — no client-side filtering needed
  const { records, loading: rLoading, error: rError } = useSalaryRecords(
    filterRange?.[0],
    filterRange?.[1]
  );

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
                          <th className={thCls}>Source</th>
                          <th className={thCls}>Currency</th>
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
                            <td className={tdCls}>{t.source}</td>
                            <td className={tdCls}>{t.currency}</td>
                            <td className={tdCls}>{fmt(t.amounts.basic)}</td>
                            <td className={tdCls}>{fmt(t.amounts.fix)}</td>
                            <td className={tdCls}>{fmt(t.amounts.variable)}</td>
                            <td className={tdCls}>{fmt(t.deductions.etf)}</td>
                            <td className={tdCls}>{fmt(t.deductions.epf)}</td>
                            <td className={tdCls}>{fmt(t.deductions.tax)}</td>
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
                  Target you've set for each month
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
                  ) : records.length === 0 ? (
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
                          <th className={thCls}>Source</th>
                          <th className={thCls}>Currency</th>
                          <th className={thCls}>Basic</th>
                          <th className={thCls}>Fix</th>
                          <th className={thCls}>Variable</th>
                          <th className={thCls}>Gross</th>
                          <th className={thCls}>ETF</th>
                          <th className={thCls}>EPF</th>
                          <th className={thCls}>Tax</th>
                          <th className={thCls}>Net</th>
                          <th className={thCls}>Note</th>
                          <th className={thCls}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {records.map((r) => {
                          const gross = r.amounts.basic + r.amounts.fix + r.amounts.variable;
                          const totalDed = r.deductions.etf + r.deductions.epf + r.deductions.tax;
                          const net = gross - totalDed;
                          return (
                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                              <td className={`${tdCls} whitespace-nowrap`}>{r.date}</td>
                              <td className={tdCls}>{r.user}</td>
                              <td className={tdCls}>{r.source}</td>
                              <td className={tdCls}>{r.currency}</td>
                              <td className={tdCls}>{fmt(r.amounts.basic)}</td>
                              <td className={tdCls}>{fmt(r.amounts.fix)}</td>
                              <td className={tdCls}>{fmt(r.amounts.variable)}</td>
                              <td className={`${tdCls} font-medium`}>{fmt(gross)}</td>
                              <td className={tdCls}>{fmt(r.deductions.etf)}</td>
                              <td className={tdCls}>{fmt(r.deductions.epf)}</td>
                              <td className={tdCls}>{fmt(r.deductions.tax)}</td>
                              <td className={`${tdCls} font-semibold text-green-600 dark:text-green-400`}>{fmt(net)}</td>
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
          </div>
        </div>

      </div>

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
