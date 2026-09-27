import { useEffect, useState } from "react";
import {
  SalaryRecordSummary,
  subscribeToSalaryRecordsSummary,
} from "../services/salaryRecordService";

const EMPTY: SalaryRecordSummary = {
  totalEarned: 0,
  totalETF:    0,
  totalEPF:    0,
  totalTax:    0,
  takeHome:    0,
  recordCount: 0,
};

export function useSalaryRecordsSummary(from?: string, to?: string) {
  const [summary, setSummary] = useState<SalaryRecordSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSalaryRecordsSummary(
      (s)   => { setSummary(s); setLoading(false); },
      (msg) => { setError(msg); setLoading(false); },
      from,
      to
    );
    return unsubscribe;
  }, [from, to]);

  return { summary, loading, error };
}
