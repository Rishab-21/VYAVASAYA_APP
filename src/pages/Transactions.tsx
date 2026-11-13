import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, dateLabel, toCSV, downloadFile } from '@/lib/format';
import { totals, filteredTransactions } from '@/lib/calc';
import { PageHead, SummaryBox, Panel, EmptyState, Badge } from '@/components/ui';
import { TransactionModal } from '@/components/TransactionModal';
import { Plus, Search, Download } from 'lucide-react';

const statusTone = (s: string): 'green' | 'amber' => s === 'Paid' ? 'green' : 'amber';
const signed = (t: string) => t === 'Sale' || t === 'Payment in' ? '+' : '−';

export function Transactions() {
  const { data, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const cur = data.settings.currency;
  const t = useMemo(() => totals(data), [data]);
  const rows = useMemo(() => filteredTransactions(data, query, filter), [data, query, filter]);

  const exportCSV = () => {
    const csv = toCSV([
      ['Date', 'Type', 'Details', 'Category', 'Status', 'Amount', 'Paid'],
      ...data.transactions.map((x) => [x.date, x.type, x.name, x.category, x.status, x.amount, x.paidAmount]),
    ]);
    downloadFile(csv, 'vyavasya-transactions.csv', 'text/csv');
    toast('Transactions exported');
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Your business activity"
        title="Transactions"
        subhead="Sales, purchases and expenses in one clear list."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={exportCSV}><Download size={14} /> Export</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add transaction</button>
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Sales recorded" value={money(t.salesAll, cur)} />
        <SummaryBox label="Expenses recorded" value={money(t.expensesAll, cur)} />
        <SummaryBox label="Transactions" value={String(data.transactions.length)} />
      </div>
      <Panel
        title="All transactions"
        subtitle="Most recent activity first"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa49d]" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-[34px] w-[130px] rounded-lg border border-line bg-white py-0 pl-7 pr-2.5 text-[11px] outline-none focus:border-brand-400 sm:w-[180px]"
              />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-[34px] rounded-lg border border-line bg-white px-2.5 text-[11px] outline-none focus:border-brand-400">
              <option value="all">All types</option>
              <option value="Sale">Sales</option>
              <option value="Purchase">Purchases</option>
              <option value="Expense">Expenses</option>
              <option value="Payment in">Payments in</option>
              <option value="Payment out">Payments out</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Details', 'Category', 'Date', 'Status', 'Amount'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No transactions match. Add one to get started." /></td></tr>
              ) : rows.map((x) => (
                <tr key={x.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.name}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.category || x.type}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.date)}</td>
                  <td className="px-[18px] py-3"><Badge tone={statusTone(x.status)}>{x.status}</Badge></td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{signed(x.type)} {money(x.amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <TransactionModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
