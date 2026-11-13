import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money, dateLabel, dateLong } from '@/lib/format';
import { PageHead, SummaryBox, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { InvoiceModal } from '@/components/InvoiceModal';
import { Modal } from '@/components/Modal';
import { Plus, Printer, Send } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { BrandArtwork } from '@/components/BrandLogo';

const statusTone = (s: string): 'green' | 'amber' | 'neutral' => s === 'Paid' ? 'green' : s === 'Draft' ? 'neutral' : 'amber';

export function Invoices() {
  const { data, postInvoice, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const cur = data.settings.currency;

  const total = data.invoices.reduce((a, x) => a + x.amount, 0);
  const awaiting = data.invoices.filter((x) => !['Paid'].includes(x.status)).length;

  const handlePost = (id: number) => {
    const res = postInvoice(id);
    if (!res.ok) { toast(res.error || 'Could not post invoice'); return; }
    toast('Invoice posted to sales and receivables');
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Sales workflow"
        title="Invoices & quotations"
        subhead="Prepare an invoice, share a quotation, or track a customer order from one workspace."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Create invoice / quotation</button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Documents" value={String(data.invoices.length)} />
        <SummaryBox label="Document value" value={money(total, cur)} />
        <SummaryBox label="Awaiting payment or reply" value={String(awaiting)} />
      </div>
      <Panel title="Sales documents" subtitle="Saved in this Vyavasya browser workspace">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Reference', 'Customer', 'Document', 'Date', 'Due date', 'Status', 'Amount', ''].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 ? (
                <tr><td colSpan={8}><EmptyState message="No documents yet. Create one to get started." /></td></tr>
              ) : data.invoices.map((x) => (
                <tr key={x.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                  <td className="px-[18px] py-3 text-[11px] font-bold text-brand">{x.ref}</td>
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{x.contactName}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.kind}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.date)}</td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{dateLabel(x.due)}</td>
                  <td className="px-[18px] py-3"><Badge tone={statusTone(x.status)}>{x.status}</Badge></td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{money(x.amount, cur)}</td>
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPrintInv(x)} className="grid h-7 w-7 place-items-center rounded border border-line text-[#657168] transition hover:bg-[#f7f8f5]" title="View / print"><Printer size={13} /></button>
                      {x.kind === 'Invoice' && !x.posted && x.status !== 'Draft' && (
                        <button onClick={() => handlePost(x.id)} className="grid h-7 w-7 place-items-center rounded border border-line text-brand transition hover:bg-brand-100" title="Post to sales"><Send size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout><b className="text-brand">Invoice records:</b> Issued invoices post sales, paid amounts and customer balances once only. This screen does not reduce stock; use Counter / POS for stock-linked sales. Sending messages and collecting online payments needs a connected provider.</Callout>
      <InvoiceModal open={open} onClose={() => setOpen(false)} />

      {/* Print modal */}
      <Modal open={!!printInv} onClose={() => setPrintInv(null)} title={`Document ${printInv?.ref || ''}`} width="max-w-lg">
        {printInv && (
          <div className="print-area p-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <BrandArtwork className="mb-2 w-36" />
                <div className="text-[11px] text-muted">{data.settings.businessName}</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-ink">{printInv.kind}</div>
                <div className="text-[11px] text-muted">{printInv.ref}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 py-4 text-[11px]">
              <div><div className="text-muted">Bill to</div><div className="font-bold text-ink">{printInv.contactName}</div></div>
              <div className="text-right">
                <div className="text-muted">Issue date: <b className="text-ink">{dateLong(printInv.date)}</b></div>
                <div className="text-muted">Due date: <b className="text-ink">{dateLong(printInv.due)}</b></div>
              </div>
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-line">{['Description', 'Qty', 'Price', 'Total'].map((h, i) => (
                <th key={h} className={`py-2 ${i === 3 ? 'text-right' : 'text-left'} text-[9px] font-bold uppercase text-[#98a199]`}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {printInv.lines.map((l, i) => (
                  <tr key={i} className="border-b border-[#f0f2ee]">
                    <td className="py-2 text-ink">{l.description}</td>
                    <td className="py-2 text-[#59645e]">{l.quantity}</td>
                    <td className="py-2 text-[#59645e]">{money(l.unitPrice, cur)}</td>
                    <td className="py-2 text-right font-bold text-ink">{money(l.quantity * l.unitPrice, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <div className="text-right">
                <div className="text-[11px] text-muted">Total: <b className="font-display text-[16px] text-ink">{money(printInv.amount, cur)}</b></div>
                {printInv.paidAmount > 0 && <div className="text-[10px] text-muted">Paid: {money(printInv.paidAmount, cur)}</div>}
                <div className="mt-2"><Badge tone={statusTone(printInv.status)}>{printInv.status}</Badge></div>
              </div>
            </div>
            <div className="mt-6 border-t border-line pt-3 text-center text-[9px] text-muted">
              This is a business record from Vyavasya, not a tax-compliant invoice unless tax rules are configured.
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-primary" onClick={() => window.print()}><Printer size={14} /> Print</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
