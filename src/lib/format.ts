import type { Currency } from './types';
import DateConverter from '@remotemerge/nepali-date-converter';

export type Calendar = 'AD' | 'BS';
const nepaliMonths = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
const nepaliDigits = (value: number) => String(value).replace(/\d/g, (digit) => '०१२३४५६७८९'[Number(digit)]);

function bsParts(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  try { return new DateConverter(date).toBs(); } catch { return null; }
}

function bsDate(date: string, includeYear: boolean): string | null {
  const parts = bsParts(date);
  if (!parts) return null;
  const formatted = `${nepaliDigits(parts.date)} ${nepaliMonths[parts.month - 1]}${includeYear ? ` ${nepaliDigits(parts.year)}` : ''} (वि.सं.)`;
  return formatted;
}

export function roundMoney(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export function money(n: number, currency: Currency): string {
  const v = roundMoney(n);
  const formatted = v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === 'INR' ? `₹ ${formatted}` : `NPR ${formatted}`;
}

export function localDateKey(d: Date = new Date()): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}

export function dateLabel(d: string, calendar: Calendar = 'AD'): string {
  if (!d) return '—';
  if (calendar === 'BS') return bsDate(d, false) || `${d} (AD)`;
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function dateLong(d: string, calendar: Calendar = 'AD'): string {
  if (!d) return '—';
  if (calendar === 'BS') {
    const bs = bsDate(d, true);
    if (!bs) return `${d} (AD)`;
    const weekday = new Date(`${d}T00:00:00`).toLocaleDateString('ne-NP', { weekday: 'long' });
    return `${weekday}, ${bs}`;
  }
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function greeting(): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}`;
}

export function todayLong(calendar: Calendar = 'AD'): string {
  if (calendar === 'BS') return dateLong(localDateKey(), 'BS');
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((v) => `"${String(v).split('"').join('""')}"`).join(','))
    .join('\n');
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function nextId(items: { id: number }[]): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}
