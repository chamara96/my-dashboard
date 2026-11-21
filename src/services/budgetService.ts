import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../lib/firebase";
import { BudgetItem, BudgetLog, BudgetPayment } from "../types/budget";

const ITEMS_PATH = "budgetItems";
const PAYMENTS_PATH = "budgetPayments";
const LOGS_PATH = "budgetLogs";

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

export function subscribeToBudgetPayments(
  onData: (items: BudgetPayment[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, PAYMENTS_PATH),
    (snapshot) => {
      const list = toList<BudgetPayment>(snapshot.val());
      list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      onData(list);
    },
    (err) => onError(err.message)
  );
}

export function subscribeToBudgetLogs(
  onData: (items: BudgetLog[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, LOGS_PATH),
    (snapshot) => {
      onData(toList<BudgetLog>(snapshot.val()));
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

/** Removes the item and every payment and log recorded against it. */
export async function deleteBudgetItem(id: string): Promise<void> {
  const [paymentsSnap, logsSnap] = await Promise.all([
    get(ref(db, PAYMENTS_PATH)),
    get(ref(db, LOGS_PATH)),
  ]);
  const updates: Record<string, null> = {
    [`${ITEMS_PATH}/${id}`]: null,
  };
  const collect = (
    path: string,
    data: Record<string, { budgetItemId: string }> | null
  ) => {
    if (!data) return;
    for (const [childId, value] of Object.entries(data)) {
      if (value.budgetItemId === id) {
        updates[`${path}/${childId}`] = null;
      }
    }
  };
  collect(PAYMENTS_PATH, paymentsSnap.val());
  collect(LOGS_PATH, logsSnap.val());
  await update(ref(db), updates);
}

export async function addBudgetLog(log: Omit<BudgetLog, "id">): Promise<void> {
  await set(push(ref(db, LOGS_PATH)), log);
}

export async function updateBudgetLog(
  id: string,
  log: Omit<BudgetLog, "id">
): Promise<void> {
  await set(ref(db, `${LOGS_PATH}/${id}`), log);
}

export async function deleteBudgetLog(id: string): Promise<void> {
  await remove(ref(db, `${LOGS_PATH}/${id}`));
}

export async function addBudgetPayment(
  payment: Omit<BudgetPayment, "id">
): Promise<void> {
  await set(push(ref(db, PAYMENTS_PATH)), payment);
}

export async function updateBudgetPayment(
  id: string,
  payment: Omit<BudgetPayment, "id">
): Promise<void> {
  await set(ref(db, `${PAYMENTS_PATH}/${id}`), payment);
}

export async function deleteBudgetPayment(id: string): Promise<void> {
  await remove(ref(db, `${PAYMENTS_PATH}/${id}`));
}
