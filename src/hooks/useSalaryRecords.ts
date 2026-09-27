import { useEffect, useState } from "react";
import { SalaryRecord } from "../types/income";
import { subscribeToSalaryRecordsPage } from "../services/salaryRecordService";

export function useSalaryRecords(from?: string, to?: string) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    const unsubscribe = subscribeToSalaryRecordsPage(
      ({ records: items }) => { setRecords(items); setLoading(false); },
      (msg)                => { setError(msg);      setLoading(false); },
      10_000,
      "first",
      undefined,
      from,
      to
    );
    return unsubscribe;
  // Re-subscribe whenever the date window changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return { records, loading, error };
}
