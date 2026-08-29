import { useEffect, useState } from "react";
import { SalaryRecord } from "../types/income";
import { subscribeToSalaryRecords } from "../services/salaryRecordService";

export function useSalaryRecords(from?: string, to?: string) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    const unsubscribe = subscribeToSalaryRecords(
      (items) => { setRecords(items); setLoading(false); },
      (msg)   => { setError(msg);     setLoading(false); },
      from,
      to
    );
    return unsubscribe;
  // Re-subscribe whenever the date window changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return { records, loading, error };
}
