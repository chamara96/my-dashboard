import { useEffect, useState } from "react";
import {
  subscribeToBudgetEntries,
  subscribeToBudgetItems,
} from "../services/budgetService";
import { BudgetEntry, BudgetItem } from "../types/budget";

export function useBudget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubItems = subscribeToBudgetItems(
      (list) => {
        setItems(list);
        setLoadingItems(false);
      },
      (msg) => {
        setError(msg);
        setLoadingItems(false);
      }
    );
    const unsubEntries = subscribeToBudgetEntries(
      (list) => {
        setEntries(list);
        setLoadingEntries(false);
      },
      (msg) => {
        setError(msg);
        setLoadingEntries(false);
      }
    );

    return () => {
      unsubItems();
      unsubEntries();
    };
  }, []);

  return {
    items,
    entries,
    loading: loadingItems || loadingEntries,
    error,
  };
}
