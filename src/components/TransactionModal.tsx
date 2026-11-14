import { useState, useEffect } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';
import type { TxnType, TxnStatus } from '@/lib/types';
import { localDateKey } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  initialType?: TxnType;
}

const types: TxnType[] = ['Sale', 'Purchase', 'Expense', 'Payment in', 'Payment out'];
const statuses: TxnStatus[] = ['Paid', 'Due', 'Part-paid'];
const categories = ['General', 'Retail sales', 'Inventory', 'Rent', 'Utilities', 'Transport', 'Supplies', 'Other'];

export function TransactionModal({ open, onClose, initialType = 'Sale' }: Props) {
  const { data, addTransaction, toast } = useStore();
  const [type, setType] = useState<TxnType>(initialType);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateKey());
  const [category, setCategory] = useState('Retail sales');
  const [status, setStatus] = useState<TxnStatus>('Paid');
  const [paidNow, setPaidNow] = useState('0');
  const [accountId, setAccountId] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setType(initialType);
      setName('');
      setAmount('');
      setDate(localDateKey());
      setCategory('Retail sales');
      setStatus('Paid');
      setPaidNow('0');
      setItemId('');
      setQuantity('1');
      setNotes('');
      setAccountId(String(data.accounts[0]?.id || ''));
    }
  }, [open, initialType, data.accounts]);

  const isPayment = type === 'Payment in' || type === 'Payment out';
  const effectiveStatus: TxnStatus = isPayment ? 'Paid' : status;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addTransaction({
      name,
      type,
      category,
      date,
      amount: Number(amount),
      status: effectiveStatus,
      paidNow: Number(paidNow),
      accountId: accountId ? Number(accountId) : null,
      itemId: itemId ? Number(itemId) : null,
      quantity: Number(quantity),
      notes: notes.trim() || undefined,
    });
    if (!res.ok) { toast(res.error || 'Could not save transaction'); return; }
    toast('Transaction saved; linked stock and balances updated');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3.5 p-5">
        <div className="col-span-full">
          <Field label="Transaction type">
            <div className="mt-1.5 flex gap-1 rounded-[9px] bg-[#f4f6f2] p-1">
              {types.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-[7px] px-1 py-2 text-[10px] font-bold transition ${
                    type === t ? 'bg-white text-brand shadow-[0_1px_4px_rgba(0,0,0,0.06)]' : 'text-[#7d8881]'
                  }`}
                >
                  {t === 'Payment in' ? 'Money in' : t === 'Payment out' ? 'Money out' : t}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="col-span-full">
          <Field label="Customer, supplier or details">
            <input
              className="field-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)}
              list="partyOptions" required placeholder="Choose a contact or enter details"
            />
            <datalist id="partyOptions">
              {data.contacts.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </Field>
        </div>

        <Field label="Total amount">
          <input className="field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required type="number" min="0.01" step="0.01" placeholder="0.00" />
        </Field>
        <Field label="Date">
          <input className="field-input" value={date} onChange={(e) => setDate(e.target.value)} required type="date" />
        </Field>
        <Field label="Category">
          <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Payment status">
          <select className="field-select" value={effectiveStatus} onChange={(e) => setStatus(e.target.value as TxnStatus)} disabled={isPayment}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Amount paid now">
          <input className="field-input" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} type="number" min="0" step="0.01" disabled={isPayment} />
        </Field>
        <Field label="Cash / account">
          <select className="field-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Choose cash or bank</option>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.type}</option>)}
          </select>
        </Field>
        <Field label="Inventory item (optional)">
          <select className="field-select" value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!(type === 'Sale' || type === 'Purchase')}>
            <option value="">No stock movement</option>
            {data.items.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.qty} {x.unit || 'pcs'} in stock</option>)}
          </select>
        </Field>
        <Field label={`Quantity moved${itemId ? ` (${data.items.find((x) => x.id === Number(itemId))?.unit || 'pcs'})` : ''}`}>
          <input className="field-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0" step="any" disabled={!(type === 'Sale' || type === 'Purchase')} />
        </Field>
        <div className="col-span-full">
          <Field label="Notes (optional)">
            <input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra detail" />
          </Field>
        </div>
        <p className="col-span-full text-[10px] text-muted">Selecting an item adjusts stock for sales or purchases. The transaction total stays the amount you enter.</p>
        <div className="col-span-full mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save transaction</button>
        </div>
      </form>
    </Modal>
  );
}
