import { useEffect, useState } from "react";
import { FamilyMember } from "../types/familyMember";
import { subscribeToFamilyMembers } from "../services/familyMemberService";

export function useFamilyMembers() {
  const [members,  setMembers]  = useState<FamilyMember[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFamilyMembers(
      (items) => { setMembers(items); setLoading(false); },
      (msg)   => { setError(msg);     setLoading(false); }
    );
    return unsubscribe;
  }, []);

  return { members, loading, error };
}
