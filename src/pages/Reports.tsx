import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { money, toCSV, downloadFile, localDateKey, dateLong } from '@/lib/format';
import { PageHead, StatCard, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import {
  Download, TrendingUp, Package, Equal, ArrowRightLeft, Wallet, Receipt,
  UsersRound, Truck, Printer, CalendarDays, BarChart3,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';

type ReportTab = 'profit' | 'cash' | 'balances' | 'products';

const dayMs = 24 * 60 * 60 * 1000;
const dateFromKey = (key: string) => new Date(`${key}T00:00:00`);
const ageInDays = (key: string, asOf: string) => Math.max(0, Math.floor((dateFromKey(asOf).getTime() - dateFromKey(key).getTime()) / dayMs));
const signedType = (type: Transaction['type']) => type === 'Sale' || type === 'Payment in';

function profitSummary(rows: Transaction[]) {
  const salesRows = rows.filter((x) => x.type === 'Sale');
  const sales = salesRows.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const expenses = rows.filter((x) => x.type === 'Expense').reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const cogs = salesRows.reduce((sum, x) => sum + (x.lineItems || []).reduce((lineSum, line) => lineSum + Number(line.costTotal || 0), 0), 0);
  const salesWithoutCost = salesRows.filter((x) => !x.lineItems?.length).reduce((sum, x) => sum + Number(x.amount || 0), 0);
  return { sales, cogs, expenses, grossProfit: sales - cogs, net: sales - cogs - expenses, salesWithoutCost };
}

function dateSpan(from: string, to: string) {
  if (!from || !to) return null;
  const n = Math.floor((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / dayMs) + 1;
  return n > 0 ? n : null;
}

export function Reports() {
  const { data, toast } = useStore();
  const cur = data.settings.currency;
  const today = localDateKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<ReportTab>('profit');

  const rangeTransactions = useMemo(() => data.transactions.filter((x) => {
    if (from && x.date < from) return false;
    if (to && x.date > to) return false;
    return true;
  }), [data.transactions, from, to]);

  const priorTransactions = useMemo(() => {
    const span = dateSpan(from, to);
    if (!span) return [];
    const priorTo = localDateKey(new Date(dateFromKey(from).getTime() - dayMs));
    const priorFrom = localDateKey(new Date(dateFromKey(priorTo).getTime() - (span - 1) * dayMs));
    return data.transactions.filter((x) => x.date >= priorFrom && x.date <= priorTo);
  }, [data.transactions, from, to]);

  const currentProfit = useMemo(() => profitSummary(rangeTransactions), [rangeTransactions]);
  const priorProfit = useMemo(() => profitSummary(priorTransactions), [priorTransactions]);
  const currentCash = useMemo(() => {
    const incoming = rangeTransactions.filter((x) => signedType(x.type)).reduce((sum, x) => sum + Number(x.paidAmount || 0), 0);
    const outgoing = rangeTransactions.filter((x) => !signedType(x.type)).reduce((sum, x) => sum + Number(x.paidAmount || 0), 0);
    return { incoming, outgoing, net: incoming - outgoing };
  }, [rangeTransactions]);

  const productRows = useMemo(() => {
    const products = new Map<number, { id: number; name: string; unit: string; quantity: number; revenue: number; cost: number }>();
    for (const tx of rangeTransactions) {
      if (tx.type !== 'Sale') continue;
      for (const line of tx.lineItems || []) {
        const row = products.get(line.itemId) || { id: line.itemId, name: line.name, unit: line.unit || data.items.find((item) => item.id === line.itemId)?.unit || 'pcs', quantity: 0, revenue: 0, cost: 0 };
        row.quantity += Number(line.quantity || 0);
        row.revenue += Number(line.quantity || 0) * Number(line.unitPrice || 0);
        row.cost += Number(line.costTotal || 0);
        products.set(line.itemId, row);
      }
    }
    return [...products.values()].map((x) => ({ ...x, margin: x.revenue - x.cost }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [rangeTransactions, data.items]);

  // Payments are applied to the oldest recorded open sale/bill for that contact.
  // This is an estimate because the current data model does not link each payment to a specific invoice.
  const agingRows = useMemo(() => {
    const asOf = to || today;
    const rows = data.transactions.filter((x) => x.date <= asOf)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const openByParty = new Map<string, { name: string; kind: 'Customer' | 'Supplier'; date: string; due: number }[]>();
    for (const tx of rows) {
      const key = tx.name.trim().toLowerCase();
      const kind = tx.type === 'Sale' ? 'Customer'
        : tx.type === 'Purchase' || tx.type === 'Expense' ? 'Supplier' : null;
      if (kind) {
        const amount = Math.max(0, Number(tx.amount || 0) - Number(tx.paidAmount || 0));
        if (amount > 0) {
          const bucket = openByParty.get(key) || [];
          bucket.push({ name: tx.name, kind, date: tx.date, due: amount });
          openByParty.set(key, bucket);
        }
        continue;
      }
      const paysCustomer = tx.type === 'Payment in';
      const paysSupplier = tx.type === 'Payment out';
      if (!paysCustomer && !paysSupplier) continue;
      let remaining = Number(tx.amount || 0);
      const bucket = openByParty.get(key) || [];
      for (const open of bucket) {
        if (remaining <= 0) break;
        if ((paysCustomer && open.kind !== 'Customer') || (paysSupplier && open.kind !== 'Supplier')) continue;
        const applied = Math.min(open.due, remaining);
        open.due -= applied;
        remaining -= applied;
      }
      openByParty.set(key, bucket.filter((x) => x.due > 0));
    }
    return [...openByParty.values()].flat().filter((x) => x.due > 0).map((x) => {
      const age = ageInDays(x.date, asOf);
      return { ...x, age, bucket: age <= 30 ? '0–30 days' : age <= 60 ? '31–60 days' : age <= 90 ? '61–90 days' : '90+ days' };
    }).sort((a, b) => b.age - a.age || b.due - a.due);
  }, [data.transactions, to, today]);

  const customerDue = agingRows.filter((x) => x.kind === 'Customer').reduce((sum, x) => sum + x.due, 0);
  const supplierDue = agingRows.filter((x) => x.kind === 'Supplier').reduce((sum, x) => sum + x.due, 0);
  const span = dateSpan(from, to);
  const priorLabel = span ? `${dateLong(localDateKey(new Date(dateFromKey(from).getTime() - span * dayMs)))} – ${dateLong(localDateKey(new Date(dateFromKey(from).getTime() - dayMs)))}` : '';
  const periodLabel = from && to ? (from === to ? dateLong(from) : `${dateLong(from)} – ${dateLong(to)}`) : `${from || 'All dates'} – ${to || 'Today'}`;

  const setPreset = (preset: 'today' | 'yesterday' | '7d' | '30d' | 'month') => {
    const end = dateFromKey(today);
    const start = new Date(end);
    if (preset === 'yesterday') start.setDate(start.getDate() - 1);
    if (preset === '7d') start.setDate(start.getDate() - 6);
    if (preset === '30d') start.setDate(start.getDate() - 29);
    if (preset === 'month') start.setDate(1);
    const startKey = preset === 'yesterday' ? localDateKey(start) : localDateKey(start);
    const endKey = preset === 'yesterday' ? startKey : today;
    setFrom(startKey);
    setTo(endKey);
  };

  const exportCSV = () => {
    let rows: (string | number)[][];
    let filename: string;
    if (tab === 'profit') {
      rows = [
        ['Profit & Loss estimate', periodLabel],
        ['Sales', currentProfit.sales], ['Tracked cost of sold items', currentProfit.cogs],
        ['Gross profit estimate', currentProfit.grossProfit], ['Business expenses', currentProfit.expenses],
        ['Estimated result before tax', currentProfit.net],
        ['Sales missing item cost data', currentProfit.salesWithoutCost],
        [], ['Date', 'Type', 'Details', 'Category', 'Status', 'Amount', 'Paid amount'],
        ...rangeTransactions.map((x) => [x.date, x.type, x.name, x.category, x.status, x.amount, x.paidAmount]),
      ];
      filename = 'vyavasaya-profit-loss.csv';
    } else if (tab === 'cash') {
      rows = [['Cash movement estimate', periodLabel], ['Money received', currentCash.incoming], ['Money paid', currentCash.outgoing], ['Net cash movement', currentCash.net], [], ['Date', 'Type', 'Details', 'Account', 'Amount paid'], ...rangeTransactions.map((x) => [x.date, x.type, x.name, data.accounts.find((a) => a.id === x.accountId)?.name || '—', x.paidAmount])];
      filename = 'vyavasaya-cash-movement.csv';
    } else if (tab === 'balances') {
      rows = [['Open transaction balances as of', to || today], ['Contact', 'Type', 'Recorded date', 'Age in days', 'Age band', 'Estimated balance'], ...agingRows.map((x) => [x.name, x.kind, x.date, x.age, x.bucket, x.due])];
      filename = 'vyavasaya-open-balances.csv';
    } else {
      rows = [['Product performance', periodLabel], ['Product', 'Quantity sold', 'Unit', 'Sales', 'Tracked item cost', 'Estimated gross margin'], ...productRows.map((x) => [x.name, x.quantity, x.unit, x.revenue, x.cost, x.margin])];
      filename = 'vyavasaya-product-performance.csv';
    }
    downloadFile(toCSV(rows), filename, 'text/csv');
    toast('Report exported');
  };

  const tabs: { id: ReportTab; label: string; icon: typeof TrendingUp }[] = [
    { id: 'profit', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'cash', label: 'Cash movement', icon: Wallet },
    { id: 'balances', label: 'Open balances', icon: UsersRound },
    { id: 'products', label: 'Product performance', icon: Package },
  ];

  return (
    <div className="animate-fade print-area">
      <PageHead
        eyebrow="Understand the numbers"
        title="Business reports"
        subhead="Choose a report, set the period, and export or print the results."
        action={<div className="flex gap-2"><button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print</button><button className="btn-primary" onClick={exportCSV}><Download size={14} /> Export CSV</button></div>}
      />

      <div className="mb-4 rounded-xl border border-line bg-white px-4 py-3.5">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="field-label">From date</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input mt-1.5" /></div>
          <div><label className="field-label">To date</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field-input mt-1.5" /></div>
          <div className="flex flex-wrap gap-1.5 pb-px">
            {([['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7 days'], ['30d', '30 days'], ['month', 'This month']] as const).map(([key, label]) => (
              <button key={key} className="btn-secondary !px-2.5 !py-2 !text-[10px]" onClick={() => setPreset(key)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted"><CalendarDays size={12} /> Reporting period: <b className="text-ink">{periodLabel}</b><span className="ml-auto">{rangeTransactions.length} recorded transactions</span></div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Report type">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${tab === id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-[#59645e] hover:border-brand-300'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'profit' && <>
        <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard label="Sales" icon={<TrendingUp size={14} />} value={money(currentProfit.sales, cur)} foot="Recorded sales in this period" />
          <StatCard label="Tracked item cost" icon={<Package size={14} />} value={money(currentProfit.cogs, cur)} foot="Cost saved on stock-linked sales" />
          <StatCard label="Gross profit estimate" icon={<Equal size={14} />} value={money(currentProfit.grossProfit, cur)} foot="Sales less tracked item cost" tone={currentProfit.grossProfit >= 0 ? 'positive' : 'negative'} />
          <StatCard label="Estimated result before tax" icon={<Receipt size={14} />} value={money(currentProfit.net, cur)} foot="Gross profit less recorded expenses" tone={currentProfit.net >= 0 ? 'positive' : 'negative'} />
        </div>
        {span && <Panel title="Compared with the previous period" subtitle={`Previous matching ${span}-day period: ${priorLabel}`} className="mb-4">
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {([
              ['Sales', currentProfit.sales, priorProfit.sales],
              ['Expenses', currentProfit.expenses, priorProfit.expenses],
              ['Estimated result', currentProfit.net, priorProfit.net],
            ] as [string, number, number][]).map(([label, current, prior]) => {
              const delta = current - prior;
              return <div key={label} className="rounded-lg bg-[#f7f8f5] p-3"><div className="text-[10px] text-muted">{label}</div><div className="mt-1 font-display text-[18px] font-bold text-ink">{money(current, cur)}</div><div className={`mt-1 text-[10px] ${delta >= 0 ? 'text-[#3c9770]' : 'text-danger'}`}>{delta >= 0 ? '+' : '−'}{money(Math.abs(delta), cur)} vs previous · previous {money(prior, cur)}</div></div>;
            })}
          </div>
        </Panel>}
        <Panel title="Profit & Loss estimate" subtitle={periodLabel}>
          <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap">
            <thead><tr>{['Measure', 'How it is calculated', 'Amount'].map((h, i) => <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody>{[
              ['Sales', 'Recorded sales in selected dates', currentProfit.sales],
              ['Tracked cost of goods sold', 'Saved cost for item-linked sales only', -currentProfit.cogs],
              ['Gross profit estimate', 'Sales less tracked cost of goods sold', currentProfit.grossProfit],
              ['Operating expenses', 'Recorded expense transactions', -currentProfit.expenses],
              ['Estimated result before tax', 'Gross profit less recorded expenses', currentProfit.net],
            ].map(([label, description, amount], i) => <tr key={String(label)} className={`border-t border-[#f0f2ee] ${i === 2 || i === 4 ? 'bg-[#fafbf9]' : ''}`}><td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{label}</td><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{description}</td><td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(Number(amount), cur)}</td></tr>)}</tbody>
          </table></div>
        </Panel>
        {currentProfit.salesWithoutCost > 0 && <Callout><b className="text-brand">Some sales have no item cost saved.</b> {money(currentProfit.salesWithoutCost, cur)} of sales are missing item-level cost data, so the profit estimate may be higher than actual profit.</Callout>}
      </>}

      {tab === 'cash' && <>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Money received" icon={<TrendingUp size={14} />} value={money(currentCash.incoming, cur)} foot="Paid amounts on sales and receipts" />
          <StatCard label="Money paid" icon={<ArrowRightLeft size={14} />} value={money(currentCash.outgoing, cur)} foot="Paid amounts on purchases and costs" />
          <StatCard label="Net cash movement" icon={<Wallet size={14} />} value={money(currentCash.net, cur)} foot="Received less paid in this period" tone={currentCash.net >= 0 ? 'positive' : 'negative'} />
        </div>
        <Panel title="Cash movement details" subtitle="Calculated from recorded paid amounts during the selected period">
          <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Date', 'Activity', 'Account', 'Recorded amount', 'Paid amount'].map((h, i) => <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>
            {rangeTransactions.filter((x) => x.paidAmount > 0).length === 0 ? <tr><td colSpan={5}><EmptyState message="No paid transaction amounts in this period." /></td></tr> : rangeTransactions.filter((x) => x.paidAmount > 0).map((x) => <tr key={x.id} className="border-t border-[#f0f2ee]"><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLong(x.date)}</td><td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.type}: {x.name}</td><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{data.accounts.find((a) => a.id === x.accountId)?.name || 'Not assigned'}</td><td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{money(x.amount, cur)}</td><td className={`px-[18px] py-3 text-right text-[11px] font-bold ${signedType(x.type) ? 'text-[#3c9770]' : 'text-danger'}`}>{signedType(x.type) ? '+' : '−'} {money(x.paidAmount, cur)}</td></tr>)}
          </tbody></table></div>
        </Panel>
        <Callout>Cash movement is based on the transaction date and paid amount saved in Vyavasaya. It does not yet have separate payment dates or bank statement reconciliation.</Callout>
      </>}

      {tab === 'balances' && <>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard label="Customer balances" icon={<UsersRound size={14} />} value={money(customerDue, cur)} foot="Open recorded sales after estimated allocations" /><StatCard label="Supplier balances" icon={<Truck size={14} />} value={money(supplierDue, cur)} foot="Open recorded purchases and expenses" /><StatCard label="Total open transactions" icon={<Receipt size={14} />} value={String(agingRows.length)} foot="Individual recorded items still unpaid" /></div>
        <Panel title="Open transaction balances" subtitle={`Estimated age from transaction date · as of ${dateLong(to || today)}`}>
          <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Contact', 'Type', 'Recorded date', 'Age', 'Age band', 'Balance'].map((h, i) => <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>
            {agingRows.length === 0 ? <tr><td colSpan={6}><EmptyState message="No unpaid sales, purchases, or expenses were found in recorded transactions." /></td></tr> : agingRows.map((x, i) => <tr key={`${x.kind}-${x.name}-${x.date}-${i}`} className="border-t border-[#f0f2ee]"><td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.name}</td><td className="px-[18px] py-3"><Badge tone={x.kind === 'Customer' ? 'green' : 'amber'}>{x.kind} owes</Badge></td><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLong(x.date)}</td><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.age} days</td><td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.bucket}</td><td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(x.due, cur)}</td></tr>)}
          </tbody></table></div>
        </Panel>
        <Callout>Payments are estimated against each contact’s oldest recorded open transaction because the app does not yet link a payment to a specific invoice. Opening balances and invoice due dates are not included in this aging estimate.</Callout>
      </>}

      {tab === 'products' && <>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard label="Products sold" icon={<Package size={14} />} value={String(productRows.length)} foot="Items with recorded sales" /><StatCard label="Sales from tracked items" icon={<BarChart3 size={14} />} value={money(productRows.reduce((sum, x) => sum + x.revenue, 0), cur)} foot="Line-item sales in this period" /><StatCard label="Estimated item margin" icon={<Equal size={14} />} value={money(productRows.reduce((sum, x) => sum + x.margin, 0), cur)} foot="Sales less saved item cost" tone="positive" /></div>
        <Panel title="Product sales and margin" subtitle="Ranked by recorded item sales">
          <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Product', 'Quantity sold', 'Sales', 'Tracked cost', 'Estimated margin'].map((h, i) => <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>
            {productRows.length === 0 ? <tr><td colSpan={5}><EmptyState message="No item-linked sales were recorded during this period." /></td></tr> : productRows.map((x) => <tr key={x.id} className="border-t border-[#f0f2ee]"><td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.name}</td><td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{x.quantity} {x.unit}</td><td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(x.revenue, cur)}</td><td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{money(x.cost, cur)}</td><td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(x.margin, cur)}</td></tr>)}
          </tbody></table></div>
        </Panel>
        <Callout>Only sales with saved item lines are included. Sales entered without inventory items and cost changes over time are not reflected in this product estimate.</Callout>
      </>}

      <p className="mt-3.5 text-[11px] text-muted">These reports summarize saved records for planning. They do not yet provide double-entry bookkeeping, tax calculations, depreciation, or tax-compliant statements.</p>
    </div>
  );
}
