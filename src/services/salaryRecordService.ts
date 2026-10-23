import {
  ref,
  query,
  orderByChild,
  startAt,
  endAt,
  endBefore,
  startAfter,
  limitToLast,
  limitToFirst,
  onValue,
  push,
  set,
  remove,
} from "firebase/database";
import { db } from "../lib/firebase";
import { SalaryRecord } from "../types/income";
import { grossOf, normalizeSalaryPay } from "../utils/salaryPay";

const PATH = "salaryRecords";

/** Newest salary date first. Push id only breaks ties on the same date. */
function bySalaryDateDesc(a: SalaryRecord, b: SalaryRecord): number {
  const byDate = (b.date ?? "").localeCompare(a.date ?? "");
  if (byDate !== 0) return byDate;
  return b.id.localeCompare(a.id);
}

// ── Cursor type for DB-level pagination ───────────────────────────────────────
// Pages are shown newest salary date first. "Next" moves to older records
// (endBefore the oldest row on the page). "Prev" moves to newer records
// (startAfter the newest row on the page).

export interface SalaryRecordCursor {
  /** ISO date of the boundary record */
  date: string;
  /** Firebase push-key of the boundary record (needed to break date ties) */
  key: string;
}

export interface SalaryRecordsPage {
  records: SalaryRecord[];
  /** Cursor pointing at the oldest record on this page (use for "next" / older) */
  endCursor:   SalaryRecordCursor | null;
  /** Cursor pointing at the newest record on this page (use for "prev" / newer) */
  startCursor: SalaryRecordCursor | null;
}

/**
 * Fetches one page of salary records ordered newest-first.
 *
 * Direction "next"  → endBefore(cursor)  + limitToLast(n)  → older records
 * Direction "prev"  → startAfter(cursor) + limitToFirst(n) → newer records (reverse after)
 * Direction "first" → no cursor          + limitToLast(n)  → most recent n
 *
 * Requires ".indexOn": ["date"] in RTDB rules.
 */
export function subscribeToSalaryRecordsPage(
  onData:    (page: SalaryRecordsPage) => void,
  onError:   (message: string) => void,
  pageSize:  number,
  direction: "first" | "next" | "prev",
  cursor?:   SalaryRecordCursor,
  from?:     string,
  to?:       string
): () => void {
  const baseRef = ref(db, PATH);

  let dbQuery;

  if (direction === "first") {
    // Most-recent n records (optionally in date range)
    dbQuery = from && to
      ? query(baseRef, orderByChild("date"), startAt(from), endAt(to), limitToLast(pageSize))
      : query(baseRef, orderByChild("date"), limitToLast(pageSize));
  } else if (direction === "next" && cursor) {
    // Go older: exclude everything at-or-after the cursor
    dbQuery = from && to
      ? query(baseRef, orderByChild("date"), startAt(from), endBefore(cursor.date, cursor.key), limitToLast(pageSize))
      : query(baseRef, orderByChild("date"), endBefore(cursor.date, cursor.key), limitToLast(pageSize));
  } else if (direction === "prev" && cursor) {
    // Go newer: exclude everything at-or-before the cursor, take first n, then reverse
    dbQuery = from && to
      ? query(baseRef, orderByChild("date"), startAfter(cursor.date, cursor.key), endAt(to), limitToFirst(pageSize))
      : query(baseRef, orderByChild("date"), startAfter(cursor.date, cursor.key), limitToFirst(pageSize));
  } else {
    // Fallback: first page
    dbQuery = query(baseRef, orderByChild("date"), limitToLast(pageSize));
  }

  return onValue(
    dbQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onData({ records: [], startCursor: null, endCursor: null });
        return;
      }

      // snapshot.val() is a plain object keyed by the push id, so Object.entries
      // follows creation order and drops the orderByChild("date") order.
      // forEach walks the query order (date ascending). Sort again so the page
      // is newest salary date first, with the push id only as a same-day tiebreak.
      const list: SalaryRecord[] = [];
      snapshot.forEach((child) => {
        const id = child.key;
        if (!id) return;
        list.push(
          normalizeSalaryPay({ id, ...(child.val() as Omit<SalaryRecord, "id">) })
        );
      });
      list.sort(bySalaryDateDesc);

      const startCursor = list.length > 0
        ? { date: list[0].date, key: list[0].id }
        : null;
      const endCursor = list.length > 0
        ? { date: list[list.length - 1].date, key: list[list.length - 1].id }
        : null;

      onData({ records: list, startCursor, endCursor });
    },
    (err) => onError(err.message)
  );
}

// ── Summary aggregation (independent of pagination) ───────────────────────────

export interface SalaryRecordSummary {
  totalEarned: number;
  /** Company ETF contributions for the period. */
  totalETF: number;
  /** Employee EPF (8%) deducted from salary. */
  totalEPFEmployee: number;
  /** Employer EPF (12%). Not deducted from salary. */
  totalEPFEmployer: number;
  /** Employee + employer EPF — the amount added to the EPF fund. */
  totalEPF: number;
  totalTax: number;
  takeHome: number;
  recordCount: number;
}

export function subscribeToSalaryRecordsSummary(
  onData: (summary: SalaryRecordSummary) => void,
  onError: (message: string) => void,
  from?: string,
  to?: string
): () => void {
  const baseRef = ref(db, PATH);
  const dbQuery =
    from && to
      ? query(baseRef, orderByChild("date"), startAt(from), endAt(to))
      : baseRef;

  return onValue(
    dbQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onData({
          totalEarned: 0,
          totalETF: 0,
          totalEPFEmployee: 0,
          totalEPFEmployer: 0,
          totalEPF: 0,
          totalTax: 0,
          takeHome: 0,
          recordCount: 0,
        });
        return;
      }
      let totalEarned = 0;
      let totalETF = 0;
      let totalEPFEmployee = 0;
      let totalEPFEmployer = 0;
      let totalTax = 0;
      let recordCount = 0;

      for (const value of Object.values(data)) {
        const r = normalizeSalaryPay(value as Omit<SalaryRecord, "id">);
        const rate = r.currency === "LKR" ? 1 : (r.exchangeRate ?? 0);
        totalEarned += grossOf(r.amounts) * rate;
        totalETF += r.contributions.etf * rate;
        totalEPFEmployee += r.deductions.epfEmployee * rate;
        totalEPFEmployer += r.contributions.epfEmployer * rate;
        totalTax += r.deductions.tax * rate;
        recordCount++;
      }

      onData({
        totalEarned,
        totalETF,
        totalEPFEmployee,
        totalEPFEmployer,
        totalEPF: totalEPFEmployee + totalEPFEmployer,
        totalTax,
        takeHome: totalEarned - totalEPFEmployee - totalTax,
        recordCount,
      });
    },
    (err) => onError(err.message)
  );
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function addSalaryRecord(
  record: Omit<SalaryRecord, "id">
): Promise<void> {
  const newRef = push(ref(db, PATH));
  await set(newRef, record);
}

export async function updateSalaryRecord(
  id: string,
  record: Omit<SalaryRecord, "id">
): Promise<void> {
  await set(ref(db, `${PATH}/${id}`), record);
}

export async function deleteSalaryRecord(id: string): Promise<void> {
  await remove(ref(db, `${PATH}/${id}`));
}
