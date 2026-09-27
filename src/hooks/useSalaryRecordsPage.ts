import { useCallback, useEffect, useRef, useState } from "react";
import {
  SalaryRecordCursor,
  SalaryRecordsPage,
  subscribeToSalaryRecordsPage,
} from "../services/salaryRecordService";
import { SalaryRecord } from "../types/income";

export const PAGE_SIZE = 15;

interface UseSalaryRecordsPageReturn {
  records:  SalaryRecord[];
  loading:  boolean;
  error:    string | null;
  hasNext:  boolean;
  hasPrev:  boolean;
  goNext:   () => void;
  goPrev:   () => void;
  reset:    () => void;
}

/**
 * Cursor-based DB-level pagination for salary records.
 * Only PAGE_SIZE records are fetched from Firebase per page.
 * The summary is handled by a separate hook and is unaffected.
 */
export function useSalaryRecordsPage(
  from?: string,
  to?:   string
): UseSalaryRecordsPageReturn {
  const [records,  setRecords]  = useState<SalaryRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [hasNext,  setHasNext]  = useState(false);
  const [hasPrev,  setHasPrev]  = useState(false);

  // Stack of start-cursors for each page visited, so we can go back
  const cursorStack = useRef<SalaryRecordCursor[]>([]);
  // Current direction + cursor being shown
  const directionRef = useRef<"first" | "next" | "prev">("first");
  const cursorRef    = useRef<SalaryRecordCursor | undefined>(undefined);

  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToSalaryRecordsPage(
      (page: SalaryRecordsPage) => {
        setRecords(page.records);
        // Can go next (older) if we got a full page — there might be more
        setHasNext((page.records.length === PAGE_SIZE) && page.endCursor !== null);
        // Can go prev if we have navigated forward at least once
        setHasPrev(cursorStack.current.length > 0);
        setLoading(false);
      },
      (msg) => { setError(msg); setLoading(false); },
      PAGE_SIZE,
      directionRef.current,
      cursorRef.current,
      from,
      to
    );

    return unsubscribe;
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-subscribe whenever filter changes → reset to first page
  useEffect(() => {
    directionRef.current = "first";
    cursorRef.current    = undefined;
    cursorStack.current  = [];
    setHasPrev(false);
    return subscribe();
  }, [subscribe]);

  const goNext = useCallback(() => {
    // Push current start-cursor onto the back-stack before moving forward
    if (records.length > 0) {
      cursorStack.current = [
        ...cursorStack.current,
        { date: records[0].date, key: records[0].id },
      ];
    }
    // Cursor for "next" = oldest record on current page (end of display list)
    const oldest = records[records.length - 1];
    directionRef.current = "next";
    cursorRef.current    = oldest ? { date: oldest.date, key: oldest.id } : undefined;
    subscribe();
  }, [records, subscribe]);

  const goPrev = useCallback(() => {
    const stack = cursorStack.current;
    if (stack.length === 0) return;

    if (stack.length === 1) {
      // Going back to first page
      directionRef.current = "first";
      cursorRef.current    = undefined;
      cursorStack.current  = [];
    } else {
      // Going back one level
      const prevStartCursor = stack[stack.length - 1];
      cursorStack.current   = stack.slice(0, -1);
      directionRef.current  = "prev";
      // Use startAfter the record *before* prevStartCursor — simplest: re-fetch
      // from prevStartCursor using "prev" direction won't work cleanly, so
      // we go back to "first" and re-navigate. For simplicity: pop and reset
      // to that cursor level.
      directionRef.current = "prev";
      cursorRef.current    = prevStartCursor;
    }
    subscribe();
  }, [subscribe]);

  const reset = useCallback(() => {
    directionRef.current = "first";
    cursorRef.current    = undefined;
    cursorStack.current  = [];
    setHasPrev(false);
    subscribe();
  }, [subscribe]);

  return { records, loading, error, hasNext, hasPrev, goNext, goPrev, reset };
}
