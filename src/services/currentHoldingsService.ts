import { onValue, push, ref, remove, set } from "firebase/database";
import { db } from "../lib/firebase";
import { CurrentHolding } from "../types/goals";

// Firebase RTDB path: "currentHoldings"
const PATH = "currentHoldings";

export function subscribeToCurrentHoldings(
  onData:  (items: CurrentHolding[]) => void,
  onError: (message: string) => void
): () => void {
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: CurrentHolding[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<CurrentHolding, "id">) })
        );
        // Stable alpha order by label
        list.sort((a, b) => a.label.localeCompare(b.label));
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

/** Add a new holding — returns the new Firebase key */
export async function addCurrentHolding(
  item: Omit<CurrentHolding, "id">
): Promise<void> {
  await set(push(ref(db, PATH)), item);
}

/** Update an existing holding in-place (same row, updated amount) */
export async function updateCurrentHolding(
  id: string,
  item: Omit<CurrentHolding, "id">
): Promise<void> {
  await set(ref(db, `${PATH}/${id}`), item);
}

export async function deleteCurrentHolding(id: string): Promise<void> {
  await remove(ref(db, `${PATH}/${id}`));
}
