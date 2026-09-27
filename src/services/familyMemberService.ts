import { ref, onValue, push, set, remove, DatabaseReference } from "firebase/database";
import { db } from "../lib/firebase";
import { FamilyMember } from "../types/familyMember";

const PATH = "familyMembers";

export function subscribeToFamilyMembers(
  onData:  (items: FamilyMember[]) => void,
  onError: (message: string) => void
): () => void {
  const dbRef: DatabaseReference = ref(db, PATH);
  return onValue(
    dbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FamilyMember[] = Object.entries(data).map(
          ([id, value]) => ({ id, ...(value as Omit<FamilyMember, "id">) })
        );
        // Alphabetical by name for stable ordering in selects
        list.sort((a, b) => a.name.localeCompare(b.name));
        onData(list);
      } else {
        onData([]);
      }
    },
    (err) => onError(err.message)
  );
}

export async function addFamilyMember(
  member: Omit<FamilyMember, "id">
): Promise<void> {
  const newRef = push(ref(db, PATH));
  await set(newRef, member);
}

export async function updateFamilyMember(
  id: string,
  member: Omit<FamilyMember, "id">
): Promise<void> {
  await set(ref(db, `${PATH}/${id}`), member);
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await remove(ref(db, `${PATH}/${id}`));
}
