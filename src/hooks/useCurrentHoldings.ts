import { useEffect, useMemo, useState } from "react";
import { CurrentHolding } from "../types/goals";
import { subscribeToCurrentHoldings } from "../services/currentHoldingsService";

export interface CurrentHoldingsSummary {
  holdings:     CurrentHolding[];
  /** Sum of all holdings converted to LKR */
  totalLKR:     number;
  loading:      boolean;
  error:        string | null;
}

/** Convert a single holding to LKR */
function toHoldingLKR(h: CurrentHolding): number {
  if (h.currency === "LKR") return h.amount;
  return h.amount * (h.exchangeRate ?? 0);
}

export function useCurrentHoldings(): CurrentHoldingsSummary {
  const [holdings, setHoldings] = useState<CurrentHolding[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCurrentHoldings(
      (items) => { setHoldings(items); setLoading(false); },
      (msg)   => { setError(msg);      setLoading(false); }
    );
    return unsub;
  }, []);

  const totalLKR = useMemo(
    () => holdings.reduce((sum, h) => sum + toHoldingLKR(h), 0),
    [holdings]
  );

  return { holdings, totalLKR, loading, error };
}
