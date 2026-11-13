import { useState } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';
import type { ContactType, BalanceType } from '@/lib/types';

export function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addContact, toast } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactType>('Customer');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('0');
  const [balanceType, setBalanceType] = useState<BalanceType>('They owe me');
  const [notes, setNotes] = useState('');

  const reset = () => { setName(''); setType('Customer'); setPhone(''); setBalance('0'); setBalanceType('They owe me'); setNotes(''); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Enter a contact name'); return; }
    addContact({
      name: name.trim(), type, phone: phone.trim(),
      balance: Number(balance) || 0, balanceType, notes: notes.trim() || undefined,
    });
    toast('Contact added');
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add business contact">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3.5 p-5">
        <div className="col-span-full">
          <Field label="Name"><input className="field-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Business or person" /></Field>
        </div>
        <Field label="Type">
          <select className="field-select" value={type} onChange={(e) => setType(e.target.value as ContactType)}>
            <option>Customer</option><option>Supplier</option>
          </select>
        </Field>
        <Field label="Phone"><input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" /></Field>
        <Field label="Opening balance"><input className="field-input" value={balance} onChange={(e) => setBalance(e.target.value)} type="number" min="0" /></Field>
        <Field label="Balance type">
          <select className="field-select" value={balanceType} onChange={(e) => setBalanceType(e.target.value as BalanceType)}>
            <option>They owe me</option><option>I owe them</option>
          </select>
        </Field>
        <div className="col-span-full">
          <Field label="Notes (optional)"><input className="field-input mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra detail" /></Field>
        </div>
        <div className="col-span-full mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save contact</button>
        </div>
      </form>
    </Modal>
  );
}
