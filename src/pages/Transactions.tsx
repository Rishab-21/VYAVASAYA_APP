import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, dateLabel, toCSV, downloadFile } from '@/lib/format';
import { totals, filteredTransactions } from '@/lib/calc';
import { PageHead, SummaryBox, Panel, EmptyState, Badge } from '@/components/ui';
import { TransactionModal } from '@/components/TransactionModal';
import { Modal } from '@/components/Modal';
import { Plus, Search, Download, ReceiptText } from 'lucide-react';

const statusTone = (s: string): 'green' | 'amber' => s === 'Paid' ? 'green' : 'amber';
const signed = (t: string) => t === 'Sale' || t === 'Payment in' ? '+' : '−';

export function Transactions() {
  const { data, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<(typeof data.transactions)[number] | null>(null);
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
              <tr>{['Details', 'Category', 'Date', 'Status', 'Amount', 'Items'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="No transactions match. Add one to get started." /></td></tr>
              ) : rows.map((x) => (
                <tr key={x.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.name}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.category || x.type}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.date)}</td>
                  <td className="px-[18px] py-3"><Badge tone={statusTone(x.status)}>{x.status}</Badge></td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{signed(x.type)} {money(x.amount, cur)}</td>
                  <td className="px-[18px] py-3 text-right">
                    <button type="button" onClick={() => setSelectedTransaction(x)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-brand transition hover:border-brand-300 hover:bg-brand-100" aria-label={'View details for ' + x.name}>
                      <ReceiptText size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <TransactionModal open={open} onClose={() => setOpen(false)} />
      <Modal open={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="Transaction details" width="max-w-2xl">
        {selectedTransaction && <div className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryBox label="Type" value={selectedTransaction.type} />
            <SummaryBox label="Date" value={dateLabel(selectedTransaction.date)} />
            <SummaryBox label="Customer / details" value={selectedTransaction.name || 'Walk-in customer'} />
            <SummaryBox label="Status" value={selectedTransaction.status} />
          </div>
          <Panel title={selectedTransaction.type === 'Sale' ? 'Items purchased' : 'Recorded details'} subtitle={selectedTransaction.category || selectedTransaction.type}>
            {selectedTransaction.lineItems?.length ? <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Item', 'Quantity', 'Price / unit', 'Line total'].map((h, i) => <th key={h} className={'px-4 py-2.5 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ' + (i > 0 ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead><tbody>
              {selectedTransaction.lineItems.map((line, index) => <tr key={line.itemId + '-' + index} className="border-t border-[#f0f2ee]"><td className="px-4 py-2.5 text-[11px] font-semibold text-ink">{line.name}</td><td className="px-4 py-2.5 text-right text-[11px] text-[#59645e]">{line.quantity} {line.unit || 'pcs'}</td><td className="px-4 py-2.5 text-right text-[11px] text-[#59645e]">{money(line.unitPrice, cur)}</td><td className="px-4 py-2.5 text-right text-[11px] font-bold text-ink">{money(line.quantity * line.unitPrice, cur)}</td></tr>)}
            </tbody></table></div> : <EmptyState message="This transaction was saved without item-level details." />}
          </Panel>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-lg bg-[#f7f8f5] p-3.5">
            <div className="text-[10px] text-muted">{selectedTransaction.accountId ? 'Payment account: ' + (data.accounts.find((account) => account.id === selectedTransaction.accountId)?.name || 'Account') : 'No payment account recorded'}{selectedTransaction.notes ? <div className="mt-1 text-ink">Note: {selectedTransaction.notes}</div> : null}</div>
            <div className="text-right"><div className="text-[10px] text-muted">Total amount</div><div className="font-display text-[20px] font-bold text-ink">{money(selectedTransaction.amount, cur)}</div><div className="text-[10px] text-muted">Paid {money(selectedTransaction.paidAmount, cur)}</div></div>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
