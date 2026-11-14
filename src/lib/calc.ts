import type { AppData } from './types';
import { roundMoney, localDateKey } from './format';

export function monthKey(d = new Date()): string {
  return localDateKey(d).slice(0, 7);
}

export function totals(data: AppData) {
  const m = monthKey();
  const current = data.transactions.filter((x) => (x.date || '').slice(0, 7) === m);
  const sales = current.filter((x) => x.type === 'Sale').reduce((a, x) => a + Number(x.amount || 0), 0);
  const expenses = current.filter((x) => x.type === 'Expense').reduce((a, x) => a + Number(x.amount || 0), 0);
  const cogs = current
    .filter((x) => x.type === 'Sale')
    .reduce((a, x) => a + (x.lineItems || []).reduce((b, i) => b + Number(i.costTotal || 0), 0), 0);
  const salesAll = data.transactions.filter((x) => x.type === 'Sale').reduce((a, x) => a + Number(x.amount || 0), 0);
  const expensesAll = data.transactions.filter((x) => x.type === 'Expense').reduce((a, x) => a + Number(x.amount || 0), 0);
  const due = data.contacts
    .filter((x) => x.balanceType === 'They owe me')
    .reduce((a, x) => a + Number(x.balance || 0), 0);
  const payable = data.contacts
    .filter((x) => x.balanceType === 'I owe them')
    .reduce((a, x) => a + Number(x.balance || 0), 0);
  const low = data.items.filter((x) => x.qty <= x.reorder).length;
  const stockValue = data.items.reduce((a, x) => a + x.qty * x.cost, 0);
  return {
    sales: roundMoney(sales),
    expenses: roundMoney(expenses),
    cogs: roundMoney(cogs),
    salesAll: roundMoney(salesAll),
    expensesAll: roundMoney(expensesAll),
    due: roundMoney(due),
    payable: roundMoney(payable),
    low,
    stockValue: roundMoney(stockValue),
    net: roundMoney(sales - cogs - expenses),
  };
}

export interface DaySeries { key: string; label: string; sales: number; expenses: number; }

export function sevenDaySeries(data: AppData): DaySeries[] {
  const now = new Date();
  const days: DaySeries[] = [];
  for (let n = 6; n >= 0; n--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
    days.push({
      key: localDateKey(d),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      sales: 0,
      expenses: 0,
    });
  }
  for (const tx of data.transactions) {
    const day = days.find((x) => x.key === tx.date);
    if (!day) continue;
    if (tx.type === 'Sale') day.sales += Number(tx.amount || 0);
    if (tx.type === 'Expense') day.expenses += Number(tx.amount || 0);
  }
  return days.map((d) => ({ ...d, sales: roundMoney(d.sales), expenses: roundMoney(d.expenses) }));
}

export function lowStockItems(data: AppData) {
  return data.items.filter((x) => x.qty <= x.reorder);
}

export function recentTransactions(data: AppData, n = 5) {
  return [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, n);
}

export function filteredTransactions(data: AppData, query: string, type: string) {
  const q = query.toLowerCase();
  return [...data.transactions]
    .filter((x) => (type === 'all' || x.type === type) && `${x.name} ${x.category} ${x.date} ${(x.lineItems || []).map((item) => item.name).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}
