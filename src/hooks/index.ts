import { useState, useCallback } from "react";

/**
 * Hook for managing form state with reset capability
 */
export function useForm<T extends Record<string, unknown>>(initialState: T) {
  const [form, setForm] = useState(initialState);

  const updateField = useCallback((field: keyof T, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

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

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return { open, openModal, closeModal };
}
