import { useEffect, useState } from "react";
import {
  subscribeToBudgetItems,
  subscribeToBudgetLogs,
  subscribeToBudgetPayments,
} from "../services/budgetService";
import { BudgetItem, BudgetLog, BudgetPayment } from "../types/budget";

export function useBudget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [logs, setLogs] = useState<BudgetLog[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
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
    const unsubLogs = subscribeToBudgetLogs(
      (list) => {
        setLogs(list);
        setLoadingLogs(false);
      },
      (msg) => {
        setError(msg);
        setLoadingLogs(false);
      }
    );

    return () => {
      unsubItems();
      unsubPayments();
      unsubLogs();
    };
  }, []);

  return {
    items,
    payments,
    logs,
    loading: loadingItems || loadingPayments || loadingLogs,
    error,
  };
}
