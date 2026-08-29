import {
  ref,
  query,
  orderByChild,
  startAt,
  endAt,
  onValue,
  push,
  set,
  remove,
} from "firebase/database";
import { db } from "../lib/firebase";
import { SalaryRecord } from "../types/income";

const PATH = "salaryRecords";

export function subscribeToSalaryRecords(
  onData: (items: SalaryRecord[]) => void,
  onError: (message: string) => void,
  from?: string,
  to?: string
): () => void {
  const baseRef = ref(db, PATH);

  // When a date range is given, let Firebase do the filtering.
  // Requires the "date" field to be indexed in RTDB security rules:
  //   "salaryRecords": { ".indexOn": ["date"] }
  const dbQuery =
    from && to
      ? query(baseRef, orderByChild("date"), startAt(from), endAt(to))
      : baseRef;

  return onValue(
    dbQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: SalaryRecord[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<SalaryRecord, "id">) })
        );
        // Most-recent first
        list.sort((a, b) => (a.date < b.date ? 1 : -1));
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

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
