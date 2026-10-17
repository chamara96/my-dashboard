import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../lib/firebase";
import { BudgetItem, BudgetPayment } from "../types/budget";

const ITEMS_PATH = "budgetItems";
const PAYMENTS_PATH = "budgetPayments";

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
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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

/** Removes the item and every payment recorded against it. */
export async function deleteBudgetItem(id: string): Promise<void> {
  const snapshot = await get(ref(db, PAYMENTS_PATH));
  const data = snapshot.val() as Record<string, Omit<BudgetPayment, "id">> | null;
  const updates: Record<string, null> = {
    [`${ITEMS_PATH}/${id}`]: null,
  };
  if (data) {
    for (const [paymentId, value] of Object.entries(data)) {
      if (value.budgetItemId === id) {
        updates[`${PAYMENTS_PATH}/${paymentId}`] = null;
      }
    }
  }
  await update(ref(db), updates);
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
