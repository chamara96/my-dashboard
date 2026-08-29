import {
  ref,
  onValue,
  push,
  set,
  remove,
  DatabaseReference,
} from "firebase/database";
import { db } from "../lib/firebase";
import { SalaryTemplate } from "../types/income";

const PATH = "salaryTemplates";

export function subscribeToSalaryTemplates(
  onData: (items: SalaryTemplate[]) => void,
  onError: (message: string) => void
): () => void {
  const dbRef: DatabaseReference = ref(db, PATH);
  return onValue(
    dbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: SalaryTemplate[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<SalaryTemplate, "id">) })
        );
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

export async function addSalaryTemplate(
  template: Omit<SalaryTemplate, "id">
): Promise<void> {
  const newRef = push(ref(db, PATH));
  await set(newRef, template);
}

export async function updateSalaryTemplate(
  id: string,
  template: Omit<SalaryTemplate, "id">
): Promise<void> {
  await set(ref(db, `${PATH}/${id}`), template);
}

export async function deleteSalaryTemplate(id: string): Promise<void> {
  await remove(ref(db, `${PATH}/${id}`));
}
