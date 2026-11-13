import { useState } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';
import { localDateKey } from '@/lib/format';
import type { DocKind, InvoiceStatus } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

export function InvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addInvoice, toast } = useStore();
  const [kind, setKind] = useState<DocKind>('Invoice');
  const [contactName, setContactName] = useState('');
  const [date, setDate] = useState(localDateKey());
  const [due, setDue] = useState(localDateKey());
  const [lines, setLines] = useState<{ description: string; quantity: number; unitPrice: number }[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [status, setStatus] = useState<InvoiceStatus>('Draft');
  const [paidAmount, setPaidAmount] = useState('0');
  const [accountId, setAccountId] = useState('');

  const reset = () => {
    setKind('Invoice'); setContactName(''); setDate(localDateKey()); setDue(localDateKey());
    setLines([{ description: '', quantity: 1, unitPrice: 0 }]); setStatus('Draft'); setPaidAmount('0');
    setAccountId(String(data.accounts[0]?.id || ''));
  };

  const total = lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0 && l.unitPrice >= 0);
    const res = addInvoice({
      contactName, kind, date, due, lines: validLines,
      paidAmount: Number(paidAmount) || 0, status,
      accountId: accountId ? Number(accountId) : null,
    });
    if (!res.ok) { toast(res.error || 'Could not save invoice'); return; }
    toast('Invoice saved');
    reset();
    onClose();
  };

  const updateLine = (i: number, field: 'description' | 'quantity' | 'unitPrice', value: string | number) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    setLines(next);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create invoice / quotation" width="max-w-xl">
      <form onSubmit={submit} className="p-5">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="col-span-full"><Field label="Document type">
            <select className="field-select mt-1.5" value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>
              <option>Invoice</option><option>Quotation</option><option>Sales order</option><option>Credit note / return</option>
            </select>
          </Field></div>
          <div className="col-span-full"><Field label="Customer">
            <input className="field-input mt-1.5" value={contactName} onChange={(e) => setContactName(e.target.value)} list="invCustomers" required placeholder="Customer or walk-in" />
            <datalist id="invCustomers">{data.contacts.filter((p) => p.type === 'Customer').map((p) => <option key={p.id} value={p.name} />)}</datalist>
          </Field></div>
          <Field label="Issue date"><input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Due / valid until"><input className="field-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>

          {/* Line items */}
          <div className="col-span-full">
            <div className="field-label mb-1.5">Line items</div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="field-input flex-1" placeholder="Description" value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                  <input className="field-input w-16 text-right" type="number" min="0" step="0.01" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))} />
                  <input className="field-input w-24 text-right" type="number" min="0" step="0.01" placeholder="Price" value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', Number(e.target.value))} />
                  <div className="w-20 text-right text-[11px] font-bold text-ink">{(l.quantity * l.unitPrice).toLocaleString('en-IN')}</div>
                  {lines.length > 1 && <button type="button" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-danger"><Trash2 size={13} /></button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLines([...lines, { description: '', quantity: 1, unitPrice: 0 }])} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-500"><Plus size={13} /> Add line</button>
            <div className="mt-2 flex justify-end border-t border-line pt-2 text-[13px] font-bold text-ink">Total: {(total).toLocaleString('en-IN')}</div>
          </div>

          <Field label="Status">
            <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} disabled={kind !== 'Invoice'}>
              <option>Draft</option><option>Sent</option><option>Part-paid</option><option>Paid</option>
            </select>
          </Field>
          <Field label="Amount paid now"><input className="field-input" type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} disabled={kind !== 'Invoice'} /></Field>
          <div className="col-span-full"><Field label="Deposit account">
            <select className="field-select mt-1.5" value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={kind !== 'Invoice'}>
              <option value="">Choose cash or bank</option>
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.type}</option>)}
            </select>
          </Field></div>
          <p className="col-span-full text-[10px] text-muted">Draft invoices do not change balances. Issued invoices post sales and receivables once only.</p>
          <div className="col-span-full mt-1 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save document</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
