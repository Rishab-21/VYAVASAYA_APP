import { Settings as SettingsIcon, HelpCircle, CalendarClock } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { PageId } from '@/lib/types';

const labels: Record<PageId, string> = {
  overview: 'Overview',
  pos: 'Counter / POS',
  transactions: 'Transactions',
  contacts: 'Customers & suppliers',
  inventory: 'Inventory',
  invoices: 'Invoices & quotations',
  purchases: 'Purchase orders',
  accounts: 'Cash & accounts',
  reports: 'Reports',
  settings: 'Business settings',
};

export function Topbar({ page, onOpenMenu, onOpenSettings }: { page: PageId; onOpenMenu: () => void; onOpenSettings: () => void }) {
  const { data, toast } = useStore();
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-md md:px-9">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMenu}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-[#657168] md:hidden"
          aria-label="Open menu"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="text-[12px] text-muted">
          {data.settings.businessName} <span className="px-1.5 text-[#c2c8c2]">/</span> <b className="font-semibold text-ink">{labels[page]}</b>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[12px] text-[#59645d] sm:inline-flex">
          <CalendarClock size={14} className="text-[#9aa49d]" /> This month
        </span>
        <button
          onClick={onOpenSettings}
          className="btn-secondary hidden sm:inline-flex"
          title="Business settings"
        >
          <SettingsIcon size={14} /> Settings
        </button>
        <button
          onClick={() => toast('Tip: use Counter / POS for itemized sales, Transactions for expenses and payments, and Settings to edit this workspace or back up its data.')}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-[#657168]"
          title="Help and tips"
          aria-label="Help"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}
