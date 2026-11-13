import { useState } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';

export function ItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addItem, toast } = useStore();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState('0');
  const [reorder, setReorder] = useState('5');
  const [cost, setCost] = useState('0');
  const [retail, setRetail] = useState('0');
  const [wholesale, setWholesale] = useState('0');

  const reset = () => { setName(''); setSku(''); setCategory(''); setQty('0'); setReorder('5'); setCost('0'); setRetail('0'); setWholesale('0'); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Enter an item name'); return; }
    addItem({
      name: name.trim(), sku: sku.trim(), category: category.trim() || 'General',
      qty: Number(qty) || 0, reorder: Number(reorder) || 0,
      cost: Number(cost) || 0, retail: Number(retail) || 0, wholesale: Number(wholesale) || 0,
    });
    toast('Inventory item added');
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add inventory item">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3.5 p-5">
        <div className="col-span-full"><Field label="Item name"><input className="field-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tea, 500 g" /></Field></div>
        <Field label="SKU / barcode"><input className="field-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional item code" /></Field>
        <Field label="Category"><input className="field-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Grocery" /></Field>
        <Field label="Quantity in stock"><input className="field-input" value={qty} onChange={(e) => setQty(e.target.value)} required type="number" min="0" /></Field>
        <Field label="Reorder when below"><input className="field-input" value={reorder} onChange={(e) => setReorder(e.target.value)} required type="number" min="0" /></Field>
        <Field label="Unit cost"><input className="field-input" value={cost} onChange={(e) => setCost(e.target.value)} required type="number" min="0" /></Field>
        <Field label="Retail price"><input className="field-input" value={retail} onChange={(e) => setRetail(e.target.value)} type="number" min="0" /></Field>
        <div className="col-span-full"><Field label="Wholesale price"><input className="field-input mt-1.5" value={wholesale} onChange={(e) => setWholesale(e.target.value)} type="number" min="0" /></Field></div>
        <div className="col-span-full mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save item</button>
        </div>
      </form>
    </Modal>
  );
}
