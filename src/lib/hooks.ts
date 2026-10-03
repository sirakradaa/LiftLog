import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

/** Re-runs a synchronous loader whenever the screen gains focus. */
export function useFocusData<T>(load: () => T, deps: unknown[] = []): [T, () => void] {
  const [data, setData] = useState<T>(load);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setData(load()), deps);
  useFocusEffect(reload);
  return [data, reload];
}
