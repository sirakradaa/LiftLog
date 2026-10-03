import { create } from 'zustand';
import { kvGet, kvSet } from '@/db';
import type { Unit } from '@/types';
import { defaultWarmup, type WarmupStep } from '@/lib/calc';

export interface Settings {
  unit: Unit;
  defaultRestSeconds: number;
  restTimerNotification: boolean;
  restTimerVibrate: boolean;
  keepScreenAwake: boolean;
  barsKg: number[];
  barsLb: number[];
  platesKg: number[];
  platesLb: number[];
  warmup: WarmupStep[];
}

const DEFAULTS: Settings = {
  unit: 'lb',
  defaultRestSeconds: 120,
  restTimerNotification: true,
  restTimerVibrate: true,
  keepScreenAwake: true,
  barsKg: [20, 15, 10, 7, 0],
  barsLb: [45, 35, 25, 20, 15, 0],
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  platesLb: [45, 35, 25, 10, 5, 2.5],
  warmup: defaultWarmup,
};

function load(): Settings {
  const raw = kvGet('settings');
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export const useSettings = create<Settings>(() => load());

export function updateSettings(patch: Partial<Settings>) {
  useSettings.setState(patch);
  kvSet('settings', JSON.stringify(useSettings.getState()));
}

export const getSettings = () => useSettings.getState();
