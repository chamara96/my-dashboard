import { useEffect, useState } from "react";
import {
  subscribeToBudgetItems,
  subscribeToBudgetPayments,
} from "../services/budgetService";
import { BudgetItem, BudgetPayment } from "../types/budget";

export function useBudget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
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
    const unsubPayments = subscribeToBudgetPayments(
      (list) => {
        setPayments(list);
        setLoadingPayments(false);
      },
      (msg) => {
        setError(msg);
        setLoadingPayments(false);
      }
    );

    return () => {
      unsubItems();
      unsubPayments();
    };
  }, []);

  return {
    items,
    payments,
    loading: loadingItems || loadingPayments,
    error,
  };
}
