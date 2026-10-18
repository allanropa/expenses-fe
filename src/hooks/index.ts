import { useEffect, useState, useCallback } from "react";
import { api } from "../api";

/**
 * Generic hook for loading data with proper error handling
 */
export function useApiData<T>(url: string, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<T>(url)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    load();
  }, dependencies);

  return { data, loading, error, refetch: load };
}

/**
 * Hook for managing form state with reset capability
 */
export function useForm<T extends Record<string, unknown>>(initialState: T) {
  const [form, setForm] = useState(initialState);

  const updateField = useCallback(
    (field: keyof T, value: unknown) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setForm(initialState);
  }, [initialState]);

  return { form, setForm, updateField, reset };
}

/**
 * Hook for managing modal state
 */
export function useModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);

  const open_modal = useCallback(() => setOpen(true), []);
  const close_modal = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return { open, open_modal, close_modal, toggle };
}

/**
 * Hook for managing list selection state
 */
export function useSelection<T extends { id: number }>(items: T[], initialId?: number) {
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);

  const selected = items.find((item) => item.id === selectedId);

  const select = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const clear = useCallback(() => {
    setSelectedId(null);
  }, []);

  return { selectedId, selected, select, clear };
}
