import type { DraftSet } from '@/types';

/** Epley estimate; a single rep is its own max. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0 || reps >= 37) return 0;
  return (weight * 36) / (37 - reps);
}

export function setVolume(s: DraftSet): number {
  return s.completed && s.weight && s.reps ? s.weight * s.reps : 0;
}

export interface Bests {
  e1rm: number;
  weight: number;
  setVolume: number;
  reps: number;
  duration: number;
  distance: number;
}

export const emptyBests = (): Bests => ({ e1rm: 0, weight: 0, setVolume: 0, reps: 0, duration: 0, distance: 0 });

export function bestsOf(sets: DraftSet[], into: Bests = emptyBests()): Bests {
  for (const s of sets) {
    if (!s.completed || s.type === 'warmup') continue;
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    into.e1rm = Math.max(into.e1rm, estimate1RM(w, r));
    into.weight = Math.max(into.weight, w);
    into.setVolume = Math.max(into.setVolume, w * r);
    into.reps = Math.max(into.reps, r);
    into.duration = Math.max(into.duration, s.duration ?? 0);
    into.distance = Math.max(into.distance, s.distance ?? 0);
  }
  return into;
}

/**
 * Calorie estimate from MET for resistance training (~5 MET for vigorous lifting).
 * Rough by nature; shown as an estimate only.
 */
export function estimateCalories(bodyweightKg: number, durationSec: number, met = 5): number {
  return met * bodyweightKg * (durationSec / 3600);
}

export interface PlateResult {
  perSide: number[];
  remainder: number;
}

/** Greedy plate loading per side given the available plate sizes (same unit as target). */
export function calcPlates(target: number, bar: number, plates: number[], pairsPerPlate = 10): PlateResult {
  let perSideWeight = (target - bar) / 2;
  const perSide: number[] = [];
  if (perSideWeight <= 0) return { perSide, remainder: Math.max(0, target - bar) };
  const sorted = [...plates].filter((p) => p > 0).sort((a, b) => b - a);
  for (const p of sorted) {
    let count = 0;
    while (perSideWeight + 1e-9 >= p && count < pairsPerPlate) {
      perSide.push(p);
      perSideWeight -= p;
      count++;
    }
  }
  return { perSide, remainder: Math.max(0, perSideWeight * 2) };
}

export interface WarmupStep {
  percent: number;
  reps: number;
}

export const defaultWarmup: WarmupStep[] = [
  { percent: 0, reps: 10 },
  { percent: 40, reps: 5 },
  { percent: 60, reps: 3 },
  { percent: 80, reps: 2 },
];

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
