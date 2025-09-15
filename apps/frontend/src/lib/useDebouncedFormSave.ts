import { useCallback, useEffect, useRef, useState } from "react";
import type { FormInstance } from "antd";

export interface UseDebouncedFormSaveOptions<T> {
  delay?: number; // ms
  onSave: (values: T) => Promise<void> | void;
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseDebouncedFormSaveReturn<T> {
  onValuesChange: (_: Partial<T>, allValues: T) => void;
  triggerSaveNow: () => Promise<void>;
  isSaving: boolean;
  lastSavedAt?: Date;
}

export function useDebouncedFormSave<T extends object>(
  form: FormInstance<T>,
  { delay = 5000, onSave, isEqual }: UseDebouncedFormSaveOptions<T>
): UseDebouncedFormSaveReturn<T> {
  const timerRef = useRef<number | undefined>(undefined);
  const lastSavedRef = useRef<T | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      globalThis.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const eq = useCallback(
    (a?: T, b?: T) => {
      if (!a || !b) return false;
      if (isEqual) return isEqual(a, b);
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    },
    [isEqual]
  );

  const doSave = useCallback(async () => {
    const values = form.getFieldsValue(true) as T;
    if (eq(values, lastSavedRef.current)) return;
    setIsSaving(true);
    try {
      await onSave(values);
      lastSavedRef.current = values;
      setLastSavedAt(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave, eq]);

  const schedule = useCallback(
    (allValues: T) => {
      // If unchanged from last saved, skip scheduling
      if (eq(allValues, lastSavedRef.current)) return;
      clearTimer();
      timerRef.current = globalThis.setTimeout(() => {
        void doSave();
      }, delay) as unknown as number;
    },
    [delay, doSave, eq]
  );

  const onValuesChange = useCallback(
    (_: Partial<T>, allValues: T) => {
      schedule(allValues);
    },
    [schedule]
  );

  const triggerSaveNow = useCallback(async () => {
    clearTimer();
    await doSave();
  }, [doSave]);

  useEffect(() => {
    // Initialize last saved snapshot to current form values to avoid unnecessary saves
    lastSavedRef.current = form.getFieldsValue(true) as T;
    return () => clearTimer();
  }, [form]);

  return { onValuesChange, triggerSaveNow, isSaving, lastSavedAt };
}
