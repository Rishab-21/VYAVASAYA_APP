import { useState } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAccount, toast } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'Cash' | 'Bank' | 'Mobile wallet'>('Cash');
  const [balance, setBalance] = useState('0');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Enter an account name'); return; }
    addAccount({ name: name.trim(), type, balance: Number(balance) || 0 });
    toast('Account added');
    setName(''); setType('Cash'); setBalance('0');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add account">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3.5 p-5">
        <div className="col-span-full"><Field label="Account name"><input className="field-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Main bank account" /></Field></div>
        <Field label="Account type">
          <select className="field-select" value={type} onChange={(e) => setType(e.target.value as 'Cash' | 'Bank' | 'Mobile wallet')}>
            <option>Cash</option><option>Bank</option><option>Mobile wallet</option>
          </select>
        </Field>
        <Field label="Opening balance"><input className="field-input" value={balance} onChange={(e) => setBalance(e.target.value)} type="number" /></Field>
        <div className="col-span-full mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save account</button>
        </div>
      </form>
    </Modal>
  );
}
