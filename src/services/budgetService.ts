import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../lib/firebase";
import { BudgetEntry, BudgetItem } from "../types/budget";

const ITEMS_PATH = "budgetItems";
const ENTRIES_PATH = "budgetEntries";

function toList<T extends { id: string }>(
  data: Record<string, Omit<T, "id">> | null
): T[] {
  if (!data) return [];
  return Object.entries(data).map(([id, value]) => ({ id, ...value }) as T);
}

export function subscribeToBudgetItems(
  onData: (items: BudgetItem[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, ITEMS_PATH),
    (snapshot) => {
      const list = toList<BudgetItem>(snapshot.val());
      // Start date descending; same-day items fall back to push-id order (newest first)
      list.sort((a, b) => {
        const da = a.createdAt ?? "";
        const db_ = b.createdAt ?? "";
        if (da !== db_) return da < db_ ? 1 : -1;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
      onData(list);
    },
    (err) => onError(err.message)
  );
}

export function subscribeToBudgetEntries(
  onData: (entries: BudgetEntry[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, ENTRIES_PATH),
    (snapshot) => {
      const list = toList<BudgetEntry>(snapshot.val());
      // Date descending; same-day entries fall back to push-id order (newest first)
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
      onData(list);
    },
    (err) => onError(err.message)
  );
}

export async function addBudgetItem(
  item: Omit<BudgetItem, "id">
): Promise<void> {
  await set(push(ref(db, ITEMS_PATH)), item);
}

export async function updateBudgetItem(
  id: string,
  item: Omit<BudgetItem, "id">
): Promise<void> {
  await set(ref(db, `${ITEMS_PATH}/${id}`), item);
}

/** Removes the item and every entry recorded against it. */
export async function deleteBudgetItem(id: string): Promise<void> {
  const snapshot = await get(ref(db, ENTRIES_PATH));
  const data = snapshot.val() as Record<string, Omit<BudgetEntry, "id">> | null;
  const updates: Record<string, null> = {
    [`${ITEMS_PATH}/${id}`]: null,
  };
  if (data) {
    for (const [entryId, value] of Object.entries(data)) {
      if (value.budgetItemId === id) {
        updates[`${ENTRIES_PATH}/${entryId}`] = null;
      }
    }
  }
  await update(ref(db), updates);
}

export interface BudgetEntryInput {
  budgetItemId: string;
  title: string;
  date: string;
  note: string;
  /** Greater than 0 → a payment. null → a general log. */
  amount: number | null;
}

/** Creates a new entry, or overwrites an existing one when `id` is given. */
export async function saveBudgetEntry(
  input: BudgetEntryInput,
  id?: string | null
): Promise<void> {
  const entryRef = id ? ref(db, `${ENTRIES_PATH}/${id}`) : push(ref(db, ENTRIES_PATH));
  // Realtime Database rejects undefined, so `amount` is left out for logs.
  const payload: Omit<BudgetEntry, "id"> = {
    budgetItemId: input.budgetItemId,
    title: input.title,
    date: input.date,
    note: input.note,
    ...(input.amount !== null && input.amount > 0 ? { amount: input.amount } : {}),
  };
  await set(entryRef, payload);
}

export async function deleteBudgetEntry(id: string): Promise<void> {
  await remove(ref(db, `${ENTRIES_PATH}/${id}`));
}
