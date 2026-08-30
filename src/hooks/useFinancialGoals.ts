import { useEffect, useState } from "react";
import {
  subscribeToSnapshots,
  subscribeToRecurringEntries,
  subscribeToOneTimeEntries,
} from "../services/financialGoalService";
import {
  FinancialSnapshot,
  OneTimeEntry,
  RecurringEntry,
} from "../types/goals";

export function useFinancialGoals() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [recurring, setRecurring] = useState<RecurringEntry[]>([]);
  const [oneTime, setOneTime] = useState<OneTimeEntry[]>([]);

  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [loadingRecurring, setLoadingRecurring] = useState(true);
  const [loadingOneTime, setLoadingOneTime] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubSnapshots = subscribeToSnapshots(
      (items) => { setSnapshots(items); setLoadingSnapshots(false); },
      (msg)   => { setError(msg);       setLoadingSnapshots(false); }
    );
    const unsubRecurring = subscribeToRecurringEntries(
      (items) => { setRecurring(items); setLoadingRecurring(false); },
      (msg)   => { setError(msg);       setLoadingRecurring(false); }
    );
    const unsubOneTime = subscribeToOneTimeEntries(
      (items) => { setOneTime(items);   setLoadingOneTime(false); },
      (msg)   => { setError(msg);       setLoadingOneTime(false); }
    );

    return () => {
      unsubSnapshots();
      unsubRecurring();
      unsubOneTime();
    };
  }, []);

  const loading = loadingSnapshots || loadingRecurring || loadingOneTime;

  return { snapshots, recurring, oneTime, loading, error };
}
