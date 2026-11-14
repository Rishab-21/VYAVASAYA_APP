import { useEffect, useRef, useState } from 'react';
import { Modal, Field } from './Modal';
import { useStore } from '@/lib/store';
import { compressItemPhoto } from '@/lib/image';
import { Camera, ImagePlus, X } from 'lucide-react';
import type { Item } from '@/lib/types';

const suggestedEmojis = ['📦', '🍵', '🌾', '🧴', '🧼', '🥫', '🍎', '🥬', '👕', '🧸', '🔧', '📚'];
const unitGroups = {
  Count: ['pcs', 'pack', 'box', 'bottle', 'can', 'bag', 'pair', 'dozen'],
  Weight: ['mg', 'g', 'kg', 'tonne'],
  Volume: ['mL', 'L', 'm³'],
  Length: ['mm', 'cm', 'm', 'ft', 'in'],
  Area: ['m²', 'ft²'],
  Other: ['cylinder', 'hour', 'day'],
};
const unitValues = Object.values(unitGroups).flat();
const customUnitValue = '__custom_unit__';

export function ItemModal({ open, onClose, item }: { open: boolean; onClose: () => void; item?: Item | null }) {
  const { addItem, updateItem, toast } = useStore();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState('0');
  const [unit, setUnit] = useState('pcs');
  const [customUnit, setCustomUnit] = useState('');
  const [reorder, setReorder] = useState('5');
  const [cost, setCost] = useState('0');
  const [retail, setRetail] = useState('0');
  const [wholesale, setWholesale] = useState('0');
  const [emoji, setEmoji] = useState('📦');
  const [photo, setPhoto] = useState('');
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name || '');
    setSku(item?.sku || '');
    setCategory(item?.category || '');
    setQty(String(item?.qty ?? 0));
    const savedUnit = item?.unit || 'pcs';
    setUnit(unitValues.includes(savedUnit) ? savedUnit : customUnitValue);
    setCustomUnit(unitValues.includes(savedUnit) ? '' : savedUnit);
    setReorder(String(item?.reorder ?? 5));
    setCost(String(item?.cost ?? 0));
    setRetail(String(item?.retail ?? 0));
    setWholesale(String(item?.wholesale ?? 0));
    setEmoji(item?.emoji || '📦');
    setPhoto(item?.photo || '');
  }, [open, item]);

  const reset = () => { setName(''); setSku(''); setCategory(''); setQty('0'); setUnit('pcs'); setCustomUnit(''); setReorder('5'); setCost('0'); setRetail('0'); setWholesale('0'); setEmoji('📦'); setPhoto(''); };

  const choosePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCompressing(true);
    try {
      setPhoto(await compressItemPhoto(file));
      toast('Photo compressed and added');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not use this photo');
    } finally {
      setCompressing(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Enter an item name'); return; }
    const values = {
      name: name.trim(), sku: sku.trim(), category: category.trim() || 'General',
      qty: Number(qty) || 0, unit: unit === customUnitValue ? customUnit.trim() || 'unit' : unit, reorder: Number(reorder) || 0,
      cost: Number(cost) || 0, retail: Number(retail) || 0, wholesale: Number(wholesale) || 0,
      emoji: emoji.trim() || '📦', photo: photo || undefined,
    };
    if (item) {
      updateItem(item.id, values);
      toast('Inventory item updated');
    } else {
      addItem(values);
      toast('Inventory item added');
      reset();
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit inventory item' : 'Add inventory item'}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3.5 p-5">
        <div className="col-span-full"><Field label="Item name"><input className="field-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tea, 500 g" /></Field></div>
        <Field label="SKU / barcode"><input className="field-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional item code" /></Field>
        <Field label="Category"><input className="field-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Grocery" /></Field>
        <Field label={`Quantity in stock${unit === customUnitValue ? customUnit.trim() ? ` (${customUnit.trim()})` : '' : ` (${unit})`}`}><input className="field-input" value={qty} onChange={(e) => setQty(e.target.value)} required type="number" min="0" step="any" /></Field>
        <Field label="Unit of measure">
          <select className="field-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {Object.entries(unitGroups).map(([group, choices]) => <optgroup key={group} label={group}>{choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</optgroup>)}
            <option value={customUnitValue}>Other (enter unit)</option>
          </select>
        </Field>
        {unit === customUnitValue && <div className="col-span-full"><Field label="Custom unit"><input className="field-input mt-1.5" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} required placeholder="e.g. roll, cylinder, tray" /></Field></div>}
        <Field label={`Reorder when below (${unit === customUnitValue ? customUnit.trim() || 'unit' : unit})`}><input className="field-input" value={reorder} onChange={(e) => setReorder(e.target.value)} required type="number" min="0" step="any" /></Field>
        <Field label="Unit cost"><input className="field-input" value={cost} onChange={(e) => setCost(e.target.value)} required type="number" min="0" /></Field>
        <Field label="Retail price"><input className="field-input" value={retail} onChange={(e) => setRetail(e.target.value)} type="number" min="0" /></Field>
        <div className="col-span-full"><Field label="Wholesale price"><input className="field-input mt-1.5" value={wholesale} onChange={(e) => setWholesale(e.target.value)} type="number" min="0" /></Field></div>
        <div className="col-span-full rounded-xl border border-line bg-[#fafbf9] p-3.5">
          <div className="mb-2 text-[11px] font-semibold text-ink">Product photo <span className="font-normal text-muted">(optional)</span></div>
          <div className="flex items-center gap-3">
            <div className="grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white text-[30px]">
              {photo ? <img src={photo} alt="Selected item" className="h-full w-full object-cover" /> : emoji || '📦'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !px-2.5 !py-2 !text-[10px]" onClick={() => cameraRef.current?.click()} disabled={compressing}><Camera size={13} /> Take photo</button>
              <button type="button" className="btn-secondary !px-2.5 !py-2 !text-[10px]" onClick={() => galleryRef.current?.click()} disabled={compressing}><ImagePlus size={13} /> Choose photo</button>
              {photo && <button type="button" className="btn-secondary !px-2.5 !py-2 !text-[10px]" onClick={() => setPhoto('')}><X size={13} /> Remove</button>}
            </div>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={choosePhoto} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={choosePhoto} />
          {compressing ? <p className="mt-2 text-[10px] text-brand">Compressing photo…</p> : <p className="mt-2 text-[10px] text-muted">Photos are resized and compressed to 100 KB or less before saving.</p>}
          <div className="mt-3 border-t border-line pt-3">
            <Field label="Or use an emoji">
              <input className="field-input mt-1.5 w-24 text-center text-[20px]" value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Product emoji; use your device emoji keyboard" placeholder="📦" />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggested product emojis">
              {suggestedEmojis.map((choice) => <button key={choice} type="button" onClick={() => setEmoji(choice)} className={`grid h-8 w-8 place-items-center rounded-lg border text-[18px] transition ${emoji === choice ? 'border-brand-500 bg-brand-100' : 'border-line bg-white hover:border-brand-300'}`} aria-label={`Use ${choice} emoji`}>{choice}</button>)}
            </div>
            <p className="mt-1.5 text-[10px] text-muted">Type or paste an emoji using your device’s emoji keyboard.</p>
          </div>
        </div>
        <div className="col-span-full mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={compressing}>{compressing ? 'Compressing…' : item ? 'Save changes' : 'Save item'}</button>
        </div>
      </form>
    </Modal>
  );
}
