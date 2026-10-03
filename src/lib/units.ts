import type { Unit } from '@/types';

const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;
const CM_PER_IN = 2.54;

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function fmtNum(n: number, dp = 2): string {
  return String(round(n, dp));
}

export const toDisplayWeight = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg / KG_PER_LB);
export const fromDisplayWeight = (v: number, unit: Unit) => (unit === 'kg' ? v : v * KG_PER_LB);
export const fmtWeight = (kg: number, unit: Unit) => `${fmtNum(toDisplayWeight(kg, unit), 1)} ${unit}`;

export const distanceUnit = (unit: Unit) => (unit === 'kg' ? 'km' : 'mi');
export const toDisplayDistance = (m: number, unit: Unit) => (unit === 'kg' ? m / 1000 : m / M_PER_MI);
export const fromDisplayDistance = (v: number, unit: Unit) => (unit === 'kg' ? v * 1000 : v * M_PER_MI);

export const lengthUnit = (unit: Unit) => (unit === 'kg' ? 'cm' : 'in');
export const toDisplayLength = (cm: number, unit: Unit) => (unit === 'kg' ? cm : cm / CM_PER_IN);
export const fromDisplayLength = (v: number, unit: Unit) => (unit === 'kg' ? v : v * CM_PER_IN);

/** Formats seconds as m:ss or h:mm:ss. */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Human readable, e.g. "1h 5m" or "45m". */
export function fmtDurationShort(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/** Accepts "90", "1:30" or "1:02:03" and returns seconds. */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
