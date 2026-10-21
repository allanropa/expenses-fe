import { useState, useCallback } from "react";

/**
 * Hook for managing form state
 */
export function useForm<T extends Record<string, unknown>>(initialState: T) {
  const [form, setForm] = useState(initialState);

  return { form, setForm };
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
