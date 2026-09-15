import { ShortageReason } from '@/utils/types';

export function formatTonnes(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0 t';
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(val)} t`;
}

export function formatCurrency(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '€0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatCurrencyPerTonne(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '€0 / t';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(val);
  return `${formatted} / t`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0.0%';
  // If val is decimal (e.g. 0.8928), format as percent
  const percentVal = val <= 1 && val > 0 ? val * 100 : val;
  return `${percentVal.toFixed(1)}%`;
}

export function formatQualityUpgrade(val: number | null | undefined): string {
  if (!val || val === 0) return 'Exact';
  if (val === 1) return '+1 grade';
  return `+${val} grades`;
}

export function formatShortageReason(reason: ShortageReason): string {
  if (!reason) return 'None';
  switch (reason) {
    case 'STATION_CAPACITY_REACHED':
      return 'Station capacity reached (500 t max)';
    case 'INSUFFICIENT_COMPATIBLE_SEGMENT':
      return 'Insufficient compatible segment';
    default:
      return reason;
  }
}
