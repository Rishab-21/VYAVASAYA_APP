import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { dateLabel, money } from '@/lib/format';
import { Badge, EmptyState, PageHead, Panel, SummaryBox } from '@/components/ui';
import { ContactModal } from '@/components/ContactModal';
import { PurchaseModal } from '@/components/PurchaseModal';
import { Handshake, Package, Phone, Plus, Search, ShoppingBag } from 'lucide-react';

export function CommercialPartners() {
  const { data } = useStore();
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const partners = data.contacts.filter((contact) => contact.type === 'Supplier');
  const selected = partners.find((partner) => partner.id === selectedId) || null;
  const partnerPurchases = useMemo(() => data.purchases
    .filter((purchase) => !selected || purchase.contactName.trim().toLowerCase() === selected.name.trim().toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [data.purchases, selected]);
  const visiblePartners = partners.filter((partner) => `${partner.name} ${partner.phone} ${partner.notes || ''}`.toLowerCase().includes(query.toLowerCase()));
  const partnerTotal = (name: string) => data.purchases
    .filter((purchase) => purchase.contactName.trim().toLowerCase() === name.trim().toLowerCase())
    .reduce((sum, purchase) => sum + purchase.amount, 0);
  const totalSpent = data.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const statusTone = (status: string) => status === 'Received' || status === 'Paid' ? 'green' : status === 'Draft' ? 'neutral' : 'amber';

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Vendor records"
        title="Suppliers & purchases"
        subhead="Keep vendor contacts and a clear record of what you buy, how much it costs, and when you bought it."
        action={<div className="flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={() => setPartnerOpen(true)}><Plus size={14} /> Add partner</button>
          <button className="btn-primary" onClick={() => setPurchaseOpen(true)}><ShoppingBag size={14} /> Record purchase</button>
        </div>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Suppliers" value={String(partners.length)} />
        <SummaryBox label="Purchase records" value={String(data.purchases.length)} />
        <SummaryBox label="Recorded purchase value" value={money(totalSpent, data.settings.currency)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.8fr)]">
        <Panel title="Your partners" subtitle="Saved suppliers and vendors" action={<span className="rounded-full bg-[#f1f7f3] px-2 py-1 text-[10px] font-bold text-brand">{partners.length}</span>}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68766d]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search partners…" className="field-input pl-9" />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            <button onClick={() => setSelectedId(null)} className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left transition ${selectedId === null ? 'bg-[#dceee2] font-bold text-[#164b39] shadow-[inset_3px_0_0_#1b5c45]' : 'text-[#46584c] hover:bg-[#f4f7f3]'}`}>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand"><Package size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px]">All purchases</span><span className="block text-[10px] font-medium text-muted">From every partner</span></span>
            </button>
            {!visiblePartners.length ? <EmptyState message={partners.length ? 'No partners match your search.' : 'Add your first supplier or vendor to keep their details here.'} /> : visiblePartners.map((partner) => (
              <button key={partner.id} onClick={() => setSelectedId(partner.id)} className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left transition ${selectedId === partner.id ? 'bg-[#dceee2] font-bold text-[#164b39] shadow-[inset_3px_0_0_#1b5c45]' : 'text-[#46584c] hover:bg-[#f4f7f3]'}`}>
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${selectedId === partner.id ? 'bg-white text-brand' : 'bg-[#f5f4ed] text-[#8a6a2c]'}`}><Handshake size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12px]">{partner.name}</span><span className="block truncate text-[10px] font-medium text-muted">{partner.phone || 'No phone saved'} · {money(partnerTotal(partner.name), data.settings.currency)}</span></span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={selected ? selected.name : 'Purchase history'} subtitle={selected ? 'Vendor details and the items purchased from this partner' : 'Purchases saved across all partners'} action={selected && <button className="btn-secondary !px-2.5 !py-2 !text-[10px]" onClick={() => setPurchaseOpen(true)}>Record purchase</button>}>
          {selected && <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line bg-[#fbfcfa] px-4 py-3 text-[11px] text-[#46584c]">
            <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-brand" />{selected.phone || 'Phone not added'}</span>
            <span><b>Purchases:</b> {money(partnerTotal(selected.name), data.settings.currency)}</span>
            <span><b>Balance:</b> {selected.balanceType === 'I owe them' ? 'You owe' : 'They owe'} {money(selected.balance, data.settings.currency)}</span>
            {selected.notes && <span className="basis-full text-muted">{selected.notes}</span>}
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap">
              <thead><tr>{['Date', 'Partner', 'Purchase / item', 'Quantity', 'Unit cost', 'Line total', 'Status'].map((heading, index) => <th key={heading} className={`px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#536359] ${index >= 3 && index <= 5 ? 'text-right' : ''}`}>{heading}</th>)}</tr></thead>
              <tbody>
                {!partnerPurchases.length ? <tr><td colSpan={7}><EmptyState message={selected ? 'No purchases saved for this partner yet. Record a purchase to start their history.' : 'No purchase records yet. Add a partner, then record a purchase to begin.'} /></td></tr> : partnerPurchases.flatMap((purchase) => purchase.lines.map((line, index) => (
                  <tr key={`${purchase.id}-${index}`} className="border-t border-[#f0f2ee] hover:bg-[#fafbf9]">
                    <td className="px-3 py-3 text-[11px] text-[#46584c]">{dateLabel(purchase.date, data.settings.calendar)}</td>
                    <td className="max-w-[150px] truncate px-3 py-3 text-[11px] font-semibold text-ink">{purchase.contactName}</td>
                    <td className="px-3 py-3 text-[11px] text-ink"><span className="font-semibold">{line.description}</span><span className="ml-1.5 text-[10px] text-muted">{purchase.ref}</span></td>
                    <td className="px-3 py-3 text-right text-[11px] text-[#46584c]">{line.quantity} {line.unit || data.items.find((item) => item.name.trim().toLowerCase() === line.description.trim().toLowerCase())?.unit || 'pcs'}</td>
                    <td className="px-3 py-3 text-right text-[11px] text-[#46584c]">{money(line.unitPrice, data.settings.currency)}</td>
                    <td className="px-3 py-3 text-right text-[11px] font-bold text-ink">{money(line.quantity * line.unitPrice, data.settings.currency)}</td>
                    <td className="px-3 py-3"><Badge tone={statusTone(purchase.status)}>{purchase.status}</Badge></td>
                  </tr>
                ))) }
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <ContactModal open={partnerOpen} onClose={() => setPartnerOpen(false)} initialType="Supplier" fixedType />
      <PurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} initialSupplier={selected?.name || ''} />
    </div>
  );
}
