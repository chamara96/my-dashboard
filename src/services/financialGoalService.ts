import { onValue, orderByChild, push, query, ref, remove, set } from "firebase/database";

// Firebase RTDB indexes required in security rules:
//   "financialSnapshots": { ".indexOn": ["date"] }
//   "oneTimeEntries":     { ".indexOn": ["date"] }
//   "recurringEntries":   { ".indexOn": ["dayOfMonth"] }
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
  // Firebase returns ascending; reverse gives date descending
  const q = query(ref(db, SNAPSHOTS_PATH), orderByChild("date"));
  return onValue(
    q,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FinancialSnapshot[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<FinancialSnapshot, "id">) })
        );
        list.reverse();
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
  // orderByChild("dayOfMonth") → ascending day order (1 → 28)
  const q = query(ref(db, RECURRING_PATH), orderByChild("dayOfMonth"));
  return onValue(
    q,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: RecurringEntry[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<RecurringEntry, "id">) })
        );
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
  // orderByChild("date") → ascending date order (oldest first)
  const q = query(ref(db, ONE_TIME_PATH), orderByChild("amount"));
  return onValue(
    q,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: OneTimeEntry[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<OneTimeEntry, "id">) })
        );
        console.log(list);
        
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
