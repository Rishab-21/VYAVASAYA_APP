import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, dateLabel } from '@/lib/format';
import { PageHead, SummaryBox, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { PurchaseModal } from '@/components/PurchaseModal';
import { Plus, PackageCheck } from 'lucide-react';

const statusTone = (s: string): 'green' | 'amber' | 'neutral' => s === 'Received' || s === 'Paid' ? 'green' : s === 'Draft' ? 'neutral' : 'amber';

export function Purchases() {
  const { data, receivePurchase, toast } = useStore();
  const [open, setOpen] = useState(false);
  const cur = data.settings.currency;

  const total = data.purchases.reduce((a, x) => a + x.amount, 0);
  const awaiting = data.purchases.filter((x) => !x.received).length;

  const handleReceive = (id: number) => {
    const res = receivePurchase(id);
    if (!res.ok) { toast(res.error || 'Could not mark received'); return; }
    toast('Purchase received; stock and balances updated');
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Purchasing"
        title="Purchase orders & supplier bills"
        subhead="Track supplier orders, incoming stock, supplier bills and purchase returns."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add purchase record</button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Purchase records" value={String(data.purchases.length)} />
        <SummaryBox label="Purchase value" value={money(total, cur)} />
        <SummaryBox label="Awaiting receipt" value={String(awaiting)} />
      </div>
      <Panel title="Supplier orders" subtitle="Orders, bills and returns">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Reference', 'Supplier', 'Document', 'Date', 'Amount', 'Status', ''].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.purchases.length === 0 ? (
                <tr><td colSpan={7}><EmptyState message="No purchase records yet. Add one to get started." /></td></tr>
              ) : data.purchases.map((x) => (
                <tr key={x.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                  <td className="px-[18px] py-3 text-[11px] font-bold text-brand">{x.ref}</td>
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.contactName}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.kind}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.date)}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(x.amount, cur)}</td>
                  <td className="px-[18px] py-3">
                    <Badge tone={statusTone(x.status)}>{x.status}{x.received ? ' ✓' : ''}</Badge>
                  </td>
                  <td className="px-[18px] py-3">
                    {!x.received && (
                      <button onClick={() => handleReceive(x.id)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-brand transition hover:bg-brand-100">
                        <PackageCheck size={12} /> Mark received
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout><b className="text-brand">Purchasing records:</b> Orders and supplier bills are tracked here. Marking a purchase as received updates stock and supplier/account balances once only, preventing double-posting.</Callout>
      <PurchaseModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
