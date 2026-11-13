import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { totals } from '@/lib/calc';
import { PageHead, SummaryBox, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { ContactModal } from '@/components/ContactModal';
import { Plus, Search, ExternalLink } from 'lucide-react';

export function Contacts() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const cur = data.settings.currency;
  const t = useMemo(() => totals(data), [data]);
  const customerCount = data.contacts.filter((x) => x.type === 'Customer').length;
  const supplierCount = data.contacts.filter((x) => x.type === 'Supplier').length;
  const filtered = data.contacts.filter((c) => `${c.name} ${c.phone} ${c.type}`.toLowerCase().includes(query.toLowerCase()));

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
              <tr>{['Name', 'Type', 'Phone', 'Last activity', 'Balance', 'Reminder'].map((h, i) => (
                <th key={h} className={`px-[18px] py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="Add a customer or supplier to keep track of balances." /></td></tr>
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
      <Callout><b className="text-brand">Follow up with one tap:</b> Reminder links open a prefilled message draft; you review and send it yourself.</Callout>
      <ContactModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
