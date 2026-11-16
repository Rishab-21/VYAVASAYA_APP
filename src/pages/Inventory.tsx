import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { money, parseCSV, toCSV, downloadFile, nextId } from '@/lib/format';
import { totals, lowStockItems } from '@/lib/calc';
import { PageHead, SummaryBox, Panel, EmptyState, Badge } from '@/components/ui';
import { ItemModal } from '@/components/ItemModal';
import { Modal } from '@/components/Modal';
import { Plus, Search, Upload, Download, Pencil } from 'lucide-react';
import type { Item } from '@/lib/types';

interface PreviewRow { item: Partial<Item>; valid: boolean; error: string; }

export function Inventory() {
  const { data, importItems, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = data.settings.currency;
  const t = useMemo(() => totals(data), [data]);
  const low = useMemo(() => lowStockItems(data), [data]);

  const filtered = data.items.filter((x) => `${x.name} ${x.sku} ${x.category}`.toLowerCase().includes(query.toLowerCase()));

  const exportCSV = () => {
    const rows: (string | number)[][] = [['Name', 'SKU', 'Category', 'Quantity', 'Reorder', 'Cost', 'Retail', 'Wholesale', 'Unit']];
    for (const x of data.items) rows.push([x.name, x.sku, x.category, x.qty, x.reorder, x.cost, x.retail, x.wholesale, x.unit || 'pcs']);
    downloadFile(toCSV(rows), 'vyavasya-inventory.csv', 'text/csv');
    toast('Inventory exported');
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Unit', 'Reorder level', 'Unit cost', 'Retail price', 'Wholesale price'];
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    sheet['!cols'] = headers.map((header) => ({ wch: Math.max(header.length + 3, 16) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory');
    XLSX.writeFile(workbook, 'vyavasaya-inventory-template.xlsx');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    try {
      const buffer = await f.arrayBuffer();
      const isCsv = f.name.toLowerCase().endsWith('.csv');
      let rawRows: unknown[][];
      if (isCsv) {
        rawRows = parseCSV(new TextDecoder().decode(buffer));
      } else {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false }) as unknown[][] : [];
      }
      if (!rawRows.length) { toast('This file is empty. Add a header row and inventory items, then try again.'); return; }

      const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const aliases: Record<string, string[]> = {
        name: ['name', 'item', 'itemname', 'product', 'productname', 'description'],
        sku: ['sku', 'barcode', 'code', 'itemcode', 'productcode'],
        category: ['category', 'type', 'group'],
        qty: ['quantity', 'qty', 'stock', 'instock', 'quantityinstock', 'openingstock'],
        unit: ['unit', 'units', 'uom', 'unitofmeasure', 'measure'],
        reorder: ['reorder', 'reorderlevel', 'reorderwhenbelow', 'minimumstock', 'lowstocklevel'],
        cost: ['cost', 'unitcost', 'purchaseprice', 'buyingprice', 'costprice'],
        retail: ['retail', 'retailprice', 'saleprice', 'sellingprice', 'price'],
        wholesale: ['wholesale', 'wholesaleprice'],
      };
      const header = rawRows[0].map(normalize);
      const hasHeader = header.some((column) => Object.values(aliases).some((names) => names.includes(column)));
      const dataRows = (hasHeader ? rawRows.slice(1) : rawRows).filter((row) => row.some((cell) => String(cell ?? '').trim()));
      const fallbackOrder = ['name', 'sku', 'category', 'qty', 'unit', 'reorder', 'cost', 'retail', 'wholesale'];
      const get = (field: string, row: unknown[]) => {
        const ix = hasHeader ? header.findIndex((column) => aliases[field].includes(column)) : fallbackOrder.indexOf(field);
        return ix < 0 ? '' : String(row[ix] ?? '').trim();
      };
      const seenSkus = new Set(data.items.map((item) => String(item.sku || '').trim().toLowerCase()).filter(Boolean));
      const previewRows: PreviewRow[] = dataRows.map((row) => {
        const name = get('name', row);
        const sku = get('sku', row);
        const category = get('category', row) || 'Imported';
        const unit = get('unit', row) || 'pcs';
        const parseNumber = (value: string, fallback: number) => value === '' ? fallback : Number(value.replace(/,/g, ''));
        const qty = parseNumber(get('qty', row), 0);
        const reorder = parseNumber(get('reorder', row), 5);
        const cost = parseNumber(get('cost', row), 0);
        const retail = parseNumber(get('retail', row), 0);
        const wholesale = parseNumber(get('wholesale', row), 0);
        let error = '';
        if (!name) error = 'Missing item name';
        else if (![qty, reorder, cost, retail, wholesale].every(Number.isFinite) || [qty, reorder, cost, retail, wholesale].some((value) => value < 0)) error = 'Check quantity and price values';
        else if (sku && seenSkus.has(sku.toLowerCase())) error = 'SKU already exists';
        if (sku && !error) seenSkus.add(sku.toLowerCase());
        return { item: { name, sku, category, qty, reorder, cost, retail, wholesale, unit, emoji: '📦' }, valid: !error, error };
      });
      if (!previewRows.length) { toast('No inventory rows found below the header.'); return; }
      setPreview(previewRows);
    } catch {
      toast('Could not read this file. Please use an .xlsx, .xls, or .csv inventory sheet.');
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter((r) => r.valid);
    if (!valid.length) { toast('No valid rows to import.'); setPreview(null); return; }
    const items: Item[] = valid.map((r) => ({
      id: nextId(data.items),
      name: r.item.name!, sku: r.item.sku || '', category: r.item.category || 'Imported',
      qty: r.item.qty ?? 0, reorder: r.item.reorder ?? 5, cost: r.item.cost ?? 0,
      retail: r.item.retail ?? 0, wholesale: r.item.wholesale ?? 0, emoji: r.item.emoji || '📦',
      unit: r.item.unit || 'pcs',
    }));
    importItems(items);
    toast(`${items.length} imported${preview.length - items.length ? `, ${preview.length - items.length} skipped` : ''}`);
    setPreview(null);
  };

  const validCount = preview?.filter((r) => r.valid).length || 0;

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Know what's on your shelves"
        title="Inventory"
        subhead="Track your items and spot stock that needs attention."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={exportCSV}><Download size={14} /> Export</button>
            <button className="btn-secondary" onClick={downloadTemplate}><Download size={14} /> Template</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import Excel / CSV</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add an item</button>
          </div>
        }
      />
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" hidden onChange={handleFile} />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Items tracked" value={String(data.items.length)} />
        <SummaryBox label="Stock value" value={money(t.stockValue, cur)} />
        <SummaryBox label="Low stock" value={String(t.low)} />
      </div>

      {low.length > 0 && (
        <div className="mb-4 rounded-xl border border-accent-light bg-accent-light px-4 py-3 text-[12px] text-[#c28334]">
          <b>{low.length} item{low.length === 1 ? '' : 's'}</b> at or below reorder level: {low.slice(0, 4).map((x) => x.name).join(', ')}{low.length > 4 ? '…' : ''}
        </div>
      )}

      <Panel
        title="Your items"
        subtitle="Quantity, reorder level and price list"
        action={
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa49d]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an item…" className="h-[34px] w-[130px] rounded-lg border border-line bg-white py-0 pl-7 pr-2.5 text-[11px] outline-none focus:border-brand-400 sm:w-[180px]" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Item / SKU', 'Category', 'In stock', 'Reorder at', 'Cost', 'Retail', 'Wholesale', 'Status', ''].map((h, i) => (
                <th key={h || 'actions'} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i >= 2 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9}><EmptyState message="Add an item to start tracking stock." /></td></tr>
              ) : filtered.map((x) => (
                <tr key={x.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                  <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">
                    <span className="mr-2 inline-grid h-8 w-8 translate-y-2 place-items-center overflow-hidden rounded-md bg-[#f5f4ed] align-middle text-[17px]">
                      {x.photo ? <img src={x.photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : x.emoji || '📦'}
                    </span>{x.name}
                    {x.sku && <span className="block text-[9px] font-normal text-muted">{x.sku}</span>}
                  </td>
                  <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{x.category}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{x.qty} {x.unit || 'pcs'}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{x.reorder} {x.unit || 'pcs'}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{money(x.cost, cur)}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{money(x.retail, cur)}</td>
                  <td className="px-[18px] py-3 text-right text-[11px] text-[#59645e]">{money(x.wholesale, cur)}</td>
                  <td className="px-[18px] py-3"><Badge tone={x.qty <= x.reorder ? 'red' : 'green'}>{x.qty <= x.reorder ? 'Restock soon' : 'In stock'}</Badge></td>
                  <td className="px-[18px] py-3 text-right">
                    <button type="button" onClick={() => setEditingItem(x)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-brand transition hover:border-brand-300 hover:bg-brand-100" aria-label={`Edit ${x.name}`} title={`Edit ${x.name}`}>
                      <Pencil size={12} /> <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Spreadsheet import preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Preview inventory import" width="max-w-2xl">
        <div className="p-5">
          <p className="mb-3 text-[12px] text-[#59645e]">
            Check the first worksheet below. Valid rows will be added; rows with errors are skipped. You can import Excel (.xlsx/.xls) or CSV files.
            <span className="ml-1 font-bold text-brand">{validCount} valid</span> of {preview?.length || 0}.
          </p>
          <div className="max-h-[320px] overflow-auto rounded-lg border border-line">
            <table className="w-full border-collapse whitespace-nowrap text-[11px]">
              <thead className="sticky top-0 bg-[#f7f8f5]">
                <tr>{['Name', 'Category', 'Qty', 'Unit', 'Cost', 'Retail', 'Wholesale', 'SKU', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase text-[#98a199]">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {preview?.map((r, i) => (
                  <tr key={i} className="border-t border-[#f0f2ee]">
                    <td className="px-3 py-2 font-semibold text-ink">{r.item.name || '—'}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.category}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.qty}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.unit || 'pcs'}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.cost}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.retail}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.wholesale || 0}</td>
                    <td className="px-3 py-2 text-[#59645e]">{r.item.sku || '—'}</td>
                    <td className="px-3 py-2">{r.valid ? <Badge tone="green">OK</Badge> : <Badge tone="red">{r.error}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
            <button className="btn-primary" onClick={confirmImport} disabled={validCount === 0}>Import {validCount} item{validCount === 1 ? '' : 's'}</button>
          </div>
        </div>
      </Modal>

      <ItemModal open={open} onClose={() => setOpen(false)} />
      <ItemModal open={!!editingItem} item={editingItem} onClose={() => setEditingItem(null)} />
    </div>
  );
}
