import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { totals } from '@/lib/calc';
import { PageHead, SummaryBox, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { ContactModal } from '@/components/ContactModal';
import { Modal } from '@/components/Modal';
import { Plus, Search, ExternalLink, Receipt, Trophy } from 'lucide-react';

export function Contacts() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [purchaseHistoryContact, setPurchaseHistoryContact] = useState<(typeof data.contacts)[number] | null>(null);
  const [query, setQuery] = useState('');
  const cur = data.settings.currency;
  const t = useMemo(() => totals(data), [data]);
  const customerCount = data.contacts.filter((x) => x.type === 'Customer').length;
  const supplierCount = data.contacts.filter((x) => x.type === 'Supplier').length;
  const filtered = data.contacts.filter((c) => `${c.name} ${c.phone} ${c.type}`.toLowerCase().includes(query.toLowerCase()));
  const salesForContact = (contact: (typeof data.contacts)[number]) => data.transactions
    .filter((x) => x.type === 'Sale' && (x.contactId === contact.id || (x.contactId == null
      && data.contacts.filter((c) => c.type === 'Customer' && c.name.trim().toLowerCase() === contact.name.trim().toLowerCase()).length === 1
      && x.name.trim().toLowerCase() === contact.name.trim().toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const topCustomers = data.contacts.filter((x) => x.type === 'Customer').map((contact) => {
    const sales = salesForContact(contact);
    return { contact, orders: sales.length, spend: sales.reduce((sum, sale) => sum + sale.amount, 0) };
  }).filter((x) => x.orders > 0).sort((a, b) => b.spend - a.spend).slice(0, 5);
  const customerHistory = purchaseHistoryContact ? salesForContact(purchaseHistoryContact) : [];
  const customerHistoryTotal = customerHistory.reduce((sum, sale) => sum + sale.amount, 0);

  const reminderLink = (p: typeof data.contacts[number]) => {
    let phone = String(p.phone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = (data.settings.country === 'India' ? '91' : '977') + phone;
    if (!phone || p.balance <= 0) return null;
    const msg = encodeURIComponent(`Namaste ${p.name}, a friendly reminder about the outstanding balance of ${money(p.balance, cur)} with ${data.settings.businessName}. Please let us know if you have already made the payment. Thank you.`);
    return `https://wa.me/${phone}?text=${msg}`;
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="People you do business with"
        title="Customers & suppliers"
        subhead="Keep balances and relationships easy to follow."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add a contact</button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Customers" value={String(customerCount)} />
        <SummaryBox label="Suppliers" value={String(supplierCount)} />
        <SummaryBox label="Total to collect" value={money(t.due, cur)} />
      </div>
      <Panel title="Top customers" subtitle="Ranked by recorded purchase value" className="mb-4">
        {topCustomers.length === 0 ? <EmptyState message="Customer purchase history will appear here after sales are recorded at the counter." /> : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
            {topCustomers.map((x, index) => <button key={x.contact.id} onClick={() => setPurchaseHistoryContact(x.contact)} className="flex items-center gap-2.5 rounded-lg border border-line bg-white p-3 text-left transition hover:border-brand-300 hover:bg-[#fbfdfb]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand"><Trophy size={14} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-ink">{index + 1}. {x.contact.name}</span><span className="block text-[9px] text-muted">{x.orders} purchase{x.orders === 1 ? '' : 's'}</span></span>
              <span className="text-right text-[10px] font-bold text-brand">{money(x.spend, cur)}</span>
            </button>)}
          </div>
        )}
      </Panel>
      <Panel
        title="Business contacts"
        subtitle="Customer and supplier balances"
        action={
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa49d]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a contact…" className="h-[34px] w-[130px] rounded-lg border border-line bg-white py-0 pl-7 pr-2.5 text-[11px] outline-none focus:border-brand-400 sm:w-[180px]" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>{['Name', 'Type', 'Phone', 'Last activity', 'Balance', 'Purchase history', 'Reminder'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState message="Add a customer or supplier to keep track of balances." /></td></tr>
              ) : filtered.map((p) => {
                const link = reminderLink(p);
                return (
                  <tr key={p.id} className="border-t border-[#f0f2ee] transition hover:bg-[#fafbf9]">
                    <td className="px-[18px] py-3 text-[11px] font-semibold text-ink">{p.name}{p.notes && <div className="font-normal text-[9px] text-muted">{p.notes}</div>}</td>
                    <td className="px-[18px] py-3"><Badge tone={p.type === 'Supplier' ? 'amber' : 'green'}>{p.type}</Badge></td>
                    <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{p.phone || '—'}</td>
                    <td className="px-[18px] py-3 text-[11px] text-[#59645e]">{p.last || '—'}</td>
                    <td className="px-[18px] py-3 text-right text-[11px] font-bold text-ink">{p.balanceType === 'I owe them' ? '−' : '+'} {money(p.balance, cur)}</td>
                    <td className="px-[18px] py-3">
                      {p.type === 'Customer' && <button type="button" onClick={() => setPurchaseHistoryContact(p)} className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-500"><Receipt size={12} /> View purchases</button>}
                    </td>
                    <td className="px-[18px] py-3">
                      {link ? (
                        <a href={link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-500">Draft message <ExternalLink size={11} /></a>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout><b className="text-brand">Customer history:</b> Saved customer profiles connect counter sales to their purchase history. Top customers are ranked by recorded sale value. Follow-up links open a prefilled message draft for you to review.</Callout>
      <ContactModal open={open} onClose={() => setOpen(false)} />
      <Modal open={!!purchaseHistoryContact} onClose={() => setPurchaseHistoryContact(null)} title={`${purchaseHistoryContact?.name || 'Customer'} · Purchase history`} width="max-w-2xl">
        {purchaseHistoryContact && <div className="p-5">
          {purchaseHistoryContact.phone && <p className="mb-3 text-[11px] text-muted">Phone: <b className="text-ink">{purchaseHistoryContact.phone}</b></p>}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <SummaryBox label="Recorded visits" value={String(customerHistory.length)} />
            <SummaryBox label="Total recorded purchases" value={money(customerHistoryTotal, cur)} />
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-line">
            <table className="w-full border-collapse whitespace-nowrap"><thead className="sticky top-0 bg-white"><tr>{['Date', 'Items', 'Payment account', 'Total'].map((h, i) => <th key={h} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>
              {customerHistory.length === 0 ? <tr><td colSpan={4}><EmptyState message="No counter purchases are linked to this customer yet." /></td></tr> : customerHistory.map((sale) => <tr key={sale.id} className="border-t border-[#f0f2ee]"><td className="px-3 py-2.5 text-[10px] text-[#59645e]">{sale.date}</td><td className="max-w-[260px] truncate px-3 py-2.5 text-[10px] text-ink">{sale.lineItems?.length ? sale.lineItems.map((line) => `${line.quantity} ${line.unit || 'pcs'} ${line.name}`).join(', ') : sale.category}</td><td className="px-3 py-2.5 text-[10px] text-[#59645e]">{data.accounts.find((account) => account.id === sale.accountId)?.name || '—'}</td><td className="px-3 py-2.5 text-right text-[10px] font-bold text-ink">{money(sale.amount, cur)}</td></tr>)}
            </tbody></table>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
