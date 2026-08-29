import { useEffect, useState } from "react";
import { OtherIncome } from "../types/income";
import { subscribeToOtherIncomes } from "../services/otherIncomeService";

export function useOtherIncomes() {
  const [incomes, setIncomes] = useState<OtherIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToOtherIncomes(
      (items) => { setIncomes(items); setLoading(false); },
      (msg)   => { setError(msg);     setLoading(false); }
    );
    return unsubscribe;
  }, []);

  return { incomes, loading, error };
}
