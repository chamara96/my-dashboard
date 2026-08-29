import { useEffect, useState } from "react";
import { SalaryTemplate } from "../types/income";
import { subscribeToSalaryTemplates } from "../services/salaryTemplateService";

export function useSalaryTemplates() {
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSalaryTemplates(
      (items) => { setTemplates(items); setLoading(false); },
      (msg)   => { setError(msg);       setLoading(false); }
    );
    return unsubscribe;
  }, []);

  return { templates, loading, error };
}
