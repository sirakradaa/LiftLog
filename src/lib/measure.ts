import type { MeasureType } from '@/repo/measurements';
import type { Unit } from '@/types';
import { fmtNum, fromDisplayLength, fromDisplayWeight, lengthUnit, toDisplayLength, toDisplayWeight } from '@/lib/units';

export function measureUnit(type: MeasureType, unit: Unit): string {
  if (type === 'weight') return unit;
  if (type === 'length') return lengthUnit(unit);
  if (type === 'percent') return '%';
  return 'kcal';
}

export function toDisplayMeasure(value: number, type: MeasureType, unit: Unit): number {
  if (type === 'weight') return toDisplayWeight(value, unit);
  if (type === 'length') return toDisplayLength(value, unit);
  return value;
}

export function fromDisplayMeasure(value: number, type: MeasureType, unit: Unit): number {
  if (type === 'weight') return fromDisplayWeight(value, unit);
  if (type === 'length') return fromDisplayLength(value, unit);
  return value;
}

export function formatMeasure(value: number, type: MeasureType, unit: Unit): string {
  return `${fmtNum(toDisplayMeasure(value, type, unit), 1)} ${measureUnit(type, unit)}`;
}
