import {
  ref,
  onValue,
  push,
  set,
  remove,
  DatabaseReference,
} from "firebase/database";
import { db } from "../lib/firebase";
import { OtherIncome } from "../types/income";

const PATH = "otherIncomes";

export function subscribeToOtherIncomes(
  onData: (items: OtherIncome[]) => void,
  onError: (message: string) => void
): () => void {
  const dbRef: DatabaseReference = ref(db, PATH);
  return onValue(
    dbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: OtherIncome[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<OtherIncome, "id">) })
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

export async function addOtherIncome(
  income: Omit<OtherIncome, "id">
): Promise<void> {
  const newRef = push(ref(db, PATH));
  await set(newRef, income);
}

export async function updateOtherIncome(
  id: string,
  income: Omit<OtherIncome, "id">
): Promise<void> {
  await set(ref(db, `${PATH}/${id}`), income);
}

export async function deleteOtherIncome(id: string): Promise<void> {
  await remove(ref(db, `${PATH}/${id}`));
}
