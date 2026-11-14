import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, greeting, todayLong, dateLabel } from '@/lib/format';
import { totals, sevenDaySeries, recentTransactions, lowStockItems } from '@/lib/calc';
import { PageHead, StatCard, Panel, EmptyState, Callout } from '@/components/ui';
import { SalesChart, ChartLegend } from '@/components/SalesChart';
import {
  TrendingUp, ArrowRightLeft, TrendingDown, Package, ArrowRight,
  Plus, ShoppingCart, Receipt, Wallet,
} from 'lucide-react';
import type { PageId, TxnType } from '@/lib/types';
import { useState } from 'react';
import { TransactionModal } from '@/components/TransactionModal';
import { Capacitor } from '@capacitor/core';

const statusTone = (s: string) => s === 'Paid' ? 'green' : s === 'Due' ? 'amber' : 'amber';
const signed = (t: string) => t === 'Sale' || t === 'Payment in' ? '+' : '−';

export function Dashboard({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data } = useStore();
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnType, setTxnType] = useState<TxnType>('Sale');

  const t = useMemo(() => totals(data), [data]);
  const series = useMemo(() => sevenDaySeries(data), [data]);
  const recent = useMemo(() => recentTransactions(data, 5), [data]);
  const low = useMemo(() => lowStockItems(data).slice(0, 4), [data]);
  const cur = data.settings.currency;
  const isAndroidApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const dashboardTitle = isAndroidApp
    ? (data.settings.owner || data.settings.businessName || 'Overview')
    : `${greeting()}, ${data.settings.owner || 'there'}`;
  const dueCount = data.contacts.filter((x) => x.balance > 0 && x.balanceType === 'They owe me').length;
  const insightText = t.low
    ? `${t.low} item${t.low === 1 ? ' is' : 's are'} at or below your reorder level. Check stock before placing your next supplier order.`
    : 'Your stock is above the reorder levels you set. Add daily transactions to build a useful picture over time.';

  const quick: { label: string; sub: string; icon: typeof Plus; type: TxnType }[] = [
    { label: 'Record a sale', sub: 'Cash or credit', icon: TrendingUp, type: 'Sale' },
    { label: 'Add expense', sub: 'Log a business cost', icon: TrendingDown, type: 'Expense' },
    { label: 'Stock purchase', sub: 'Update your items', icon: ShoppingCart, type: 'Purchase' },
    { label: 'Record payment', sub: 'Money in or out', icon: Wallet, type: 'Payment in' },
  ];

  return (
    <div className="min-w-0">
      <PageHead
        eyebrow={todayLong()}
        title={dashboardTitle}
        subhead="Here's how your business is doing this month."
        action={<button className="btn-primary" onClick={() => { setTxnType('Sale'); setTxnOpen(true); }}><Plus size={15} /> Add transaction</button>}
      />

      <div className="mb-4.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Sales this month" icon={<TrendingUp size={14} />} value={money(t.sales, cur)} foot={<><span className="text-[#3c9770]">↗</span> from recorded sales</>} />
        <StatCard label="Money to collect" icon={<ArrowRightLeft size={14} />} value={money(t.due, cur)} foot={<>From <b className="text-[#59645e]">{dueCount}</b> customer accounts</>} />
        <StatCard label="Expenses" icon={<TrendingDown size={14} />} value={money(t.expenses, cur)} foot="Your recorded business costs" />
        <StatCard label="Items running low" icon={<Package size={14} />} value={`${t.low} item${t.low === 1 ? '' : 's'}`} foot="Review stock before your next order" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.85fr)]">
        <Panel title="Sales & expenses" subtitle="Daily totals from the last seven days" action={<span className="text-[11px] font-bold text-brand-500">7 days</span>}>
          <SalesChart series={series} />
          <ChartLegend />
        </Panel>
        <div className="grid gap-3.5 align-content-start">
          <Panel title="Quick actions" subtitle="Keep the day moving">
            <div className="grid grid-cols-2 gap-2 p-3.5">
              {quick.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    onClick={() => { setTxnType(q.type); setTxnOpen(true); }}
                    className="rounded-[10px] border border-line bg-white p-3 text-left transition hover:border-brand-300 hover:bg-[#fbfdfb]"
                  >
                    <span className="mb-2 grid h-[27px] w-[27px] place-items-center rounded-lg bg-brand-100 text-brand"><Icon size={14} /></span>
                    <span className="block text-[11px] font-bold text-ink">{q.label}</span>
                    <span className="mt-0.5 block text-[9px] text-muted">{q.sub}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
          <div className="rounded-xl border border-[#e5eee4] bg-[#f1f7f1] p-4">
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
              <span className="grid h-[25px] w-[25px] place-items-center rounded-lg bg-[#dceee0] text-brand">✦</span> A useful nudge
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#68766c]">{insightText}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.85fr)]">
        <Panel title="Recent activity" subtitle="Your latest business transactions" action={<button onClick={() => onNavigate('transactions')} className="text-[11px] font-bold text-brand-500">View all →</button>}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap">
              <thead>
                <tr>{['Details', 'Category', 'Date', 'Status', 'Amount'].map((h, i) => (
                  <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState message="Nothing here yet. Add your first transaction to get started." /></td></tr>
                ) : recent.map((x) => (
                  <tr key={x.id} className="border-t border-[#f0f2ee]">
                    <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.name}</td>
                    <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.category || x.type}</td>
                    <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.date)}</td>
                    <td className="px-[18px] py-3">
                      <span className={`badge ${statusTone(x.status) === 'green' ? 'badge-green' : 'badge-amber'}`}>{x.status}</span>
                    </td>
                    <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{signed(x.type)} {money(x.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Stock to check" subtitle="Items below your preferred level" action={<button onClick={() => onNavigate('inventory')} className="text-[11px] font-bold text-brand-500">All items →</button>}>
          <div className="px-[18px] pb-2.5">
            {low.length === 0 ? (
              <EmptyState message="All tracked items are above their reorder levels." />
            ) : low.map((x) => (
              <div key={x.id} className="flex items-center gap-2.5 border-b border-[#f1f2ef] py-3 last:border-0">
                <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#f5f4ed]">{x.emoji || '📦'}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-ink">{x.name}</div>
                  <div className="text-[9px] text-muted">{x.category}</div>
                </div>
                <div className="text-right text-[10px] font-bold text-danger">
                  {x.qty} {x.unit || 'pcs'} left
                  <div className="mt-0.5 font-normal text-muted">Reorder at {x.reorder} {x.unit || 'pcs'}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <TransactionModal open={txnOpen} onClose={() => setTxnOpen(false)} initialType={txnType} />
    </div>
  );
}
