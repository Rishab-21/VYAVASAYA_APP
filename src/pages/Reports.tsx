import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, toCSV, downloadFile, dateLabel, localDateKey } from '@/lib/format';
import { totals, lowStockItems } from '@/lib/calc';
import { PageHead, StatCard, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { Download, TrendingUp, Package, Equal, ArrowRightLeft } from 'lucide-react';

export function Reports() {
  const { data, toast } = useStore();
  const cur = data.settings.currency;
  const month = localDateKey().slice(0, 7);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filteredTxns = useMemo(() => {
    return data.transactions.filter((x) => {
      if (from && x.date < from) return false;
      if (to && x.date > to) return false;
      return true;
    });
  }, [data.transactions, from, to]);

  const t = useMemo(() => totals(data), [data]);
  const low = useMemo(() => lowStockItems(data), [data]);

  const rangeSales = filteredTxns.filter((x) => x.type === 'Sale').reduce((a, x) => a + x.amount, 0);
  const rangeExpenses = filteredTxns.filter((x) => x.type === 'Expense').reduce((a, x) => a + x.amount, 0);
  const rangeCogs = filteredTxns.filter((x) => x.type === 'Sale').reduce((a, x) => a + (x.lineItems || []).reduce((b, i) => b + i.costTotal, 0), 0);
  const rangeNet = rangeSales - rangeCogs - rangeExpenses;

  const exportCSV = () => {
    const csv = toCSV([
      ['Date', 'Type', 'Details', 'Category', 'Status', 'Amount', 'Paid'],
      ...filteredTxns.map((x) => [x.date, x.type, x.name, x.category, x.status, x.amount, x.paidAmount]),
    ]);
    downloadFile(csv, 'vyavasya-transactions.csv', 'text/csv');
    toast('Report exported');
  };

  const reportRows = [
    ['Sales', 'Recorded customer sales in the selected period', rangeSales],
    ['Tracked item cost', 'Cost basis saved on stock-linked sales', rangeCogs],
    ['Business expenses', 'Recorded operating expenses in the selected period', rangeExpenses],
    ['Estimated result before tax', 'Sales less tracked item cost and expenses', rangeNet],
    ['Customer balances due', 'Amounts recorded as owed to you', t.due],
  ] as [string, string, number][];

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Make sense of the numbers"
        title="Business reports"
        subhead="A starting point for understanding your recorded activity."
        action={<button className="btn-secondary" onClick={exportCSV}><Download size={14} /> Download CSV</button>}
      />

      {/* Date range filter */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white px-4 py-3.5">
        <div>
          <label className="field-label">From date</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input mt-1.5" />
        </div>
        <div>
          <label className="field-label">To date</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field-input mt-1.5" />
        </div>
        <button className="btn-secondary" onClick={() => { setFrom(''); setTo(''); }}>Clear filter</button>
        <span className="ml-auto text-[11px] text-muted">{filteredTxns.length} transactions in range</span>
      </div>

      <div className="mb-4.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Sales" icon={<TrendingUp size={14} />} value={money(rangeSales, cur)} foot="From recorded sales" />
        <StatCard label="Tracked item cost" icon={<Package size={14} />} value={money(rangeCogs, cur)} foot="Only stock-linked sales" />
        <StatCard label="Estimated result before tax" icon={<Equal size={14} />} value={money(rangeNet, cur)} foot="Sales less cost and expenses" tone={rangeNet >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Customer balances due" icon={<ArrowRightLeft size={14} />} value={money(t.due, cur)} foot="Recorded receivables" />
      </div>

      <Panel title="Period snapshot" subtitle={from || to ? `Filtered: ${from || 'start'} to ${to || 'today'}` : `Totals from entries saved (current month: ${month})`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Measure', 'What it means', 'Amount'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {reportRows.map(([label, desc, amount]) => (
                <tr key={label} className="border-t border-[#f0f2ee]">
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{label}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{desc}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {low.length > 0 && (
        <Panel title="Low-stock items" subtitle="Items at or below their reorder level" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap">
              <thead><tr>{['Item', 'Category', 'In stock', 'Reorder at', 'Status'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i >= 2 && i <= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {low.map((x) => (
                  <tr key={x.id} className="border-t border-[#f0f2ee]">
                    <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.emoji} {x.name}</td>
                    <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.category}</td>
                    <td className="px-[18px] py-3 text-right text-[11px] font-bold text-danger">{x.qty}</td>
                    <td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{x.reorder}</td>
                    <td className="px-[18px] py-3"><Badge tone="red">Restock soon</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p className="mt-3.5 text-[12px] text-muted">This estimate excludes unlinked cost of goods, tax, depreciation, and accrual adjustments. It is for planning, not tax filing or formal accounting advice.</p>
    </div>
  );
}
