import { onValue, push, ref, remove, set } from "firebase/database";
import { db } from "../lib/firebase";
import {
  FinancialSnapshot,
  OneTimeEntry,
  RecurringEntry,
} from "../types/goals";

// ── Snapshots ─────────────────────────────────────────────────────────────────

const SNAPSHOTS_PATH = "financialSnapshots";

export function subscribeToSnapshots(
  onData: (items: FinancialSnapshot[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, SNAPSHOTS_PATH),
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FinancialSnapshot[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<FinancialSnapshot, "id">) })
        );
        list.sort((a, b) => (a.date < b.date ? 1 : -1));
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

export async function addSnapshot(
  item: Omit<FinancialSnapshot, "id">
): Promise<void> {
  await set(push(ref(db, SNAPSHOTS_PATH)), item);
}

export async function updateSnapshot(
  id: string,
  item: Omit<FinancialSnapshot, "id">
): Promise<void> {
  await set(ref(db, `${SNAPSHOTS_PATH}/${id}`), item);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await remove(ref(db, `${SNAPSHOTS_PATH}/${id}`));
}

// ── Recurring Entries ──────────────────────────────────────────────────────────

const RECURRING_PATH = "recurringEntries";

export function subscribeToRecurringEntries(
  onData: (items: RecurringEntry[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, RECURRING_PATH),
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: RecurringEntry[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<RecurringEntry, "id">) })
        );
        list.sort((a, b) => {
          if (a.type !== b.type) return a.type === "income" ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

export async function addRecurringEntry(
  item: Omit<RecurringEntry, "id">
): Promise<void> {
  await set(push(ref(db, RECURRING_PATH)), item);
}

export async function updateRecurringEntry(
  id: string,
  item: Omit<RecurringEntry, "id">
): Promise<void> {
  await set(ref(db, `${RECURRING_PATH}/${id}`), item);
}

export async function deleteRecurringEntry(id: string): Promise<void> {
  await remove(ref(db, `${RECURRING_PATH}/${id}`));
}

// ── One-Time Entries ──────────────────────────────────────────────────────────

const ONE_TIME_PATH = "oneTimeEntries";

export function subscribeToOneTimeEntries(
  onData: (items: OneTimeEntry[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, ONE_TIME_PATH),
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: OneTimeEntry[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<OneTimeEntry, "id">) })
        );
        list.sort((a, b) => (a.date < b.date ? 1 : -1));
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

export async function addOneTimeEntry(
  item: Omit<OneTimeEntry, "id">
): Promise<void> {
  await set(push(ref(db, ONE_TIME_PATH)), item);
}

export async function updateOneTimeEntry(
  id: string,
  item: Omit<OneTimeEntry, "id">
): Promise<void> {
  await set(ref(db, `${ONE_TIME_PATH}/${id}`), item);
}

export async function deleteOneTimeEntry(id: string): Promise<void> {
  await remove(ref(db, `${ONE_TIME_PATH}/${id}`));
}
