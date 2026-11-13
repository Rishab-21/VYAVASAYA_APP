import { useState } from 'react';
import { useStore } from '@/lib/store';
import type { PageId } from '@/lib/types';
import { BrandLockup } from '@/components/BrandLogo';
import {
  LayoutDashboard, ShoppingCart, ArrowLeftRight, Users, Package,
  FileText, ClipboardList, Wallet, BarChart3, Settings as SettingsIcon,
  Menu, ChevronDown, Store, Sparkles, Plus, LogOut,
} from 'lucide-react';

interface NavItem { id: PageId; label: string; icon: typeof LayoutDashboard; }
const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pos', label: 'Counter / POS', icon: ShoppingCart },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'contacts', label: 'Customers & suppliers', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'invoices', label: 'Invoices & quotations', icon: FileText },
  { id: 'purchases', label: 'Purchase orders', icon: ClipboardList },
  { id: 'accounts', label: 'Cash & accounts', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function Sidebar({ page, onNavigate, open, onClose, onSignOut }: SidebarProps) {
  const { data, businesses, businessId, switchBusiness, addBusiness, toast } = useStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const initials = data.settings.owner.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'BO';

  const handleSwitch = () => {
    setSwitcherOpen(true);
    const choices = businesses.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
    const pick = window.prompt(`Your business workspaces:\n${choices}\n\nType a number to switch, or type NEW to add one.`, '');
    if (!pick) return;
    if (pick.trim().toLowerCase() === 'new') {
      const name = window.prompt('Name your new business:', 'My new business');
      if (!name) return;
      addBusiness(name.trim());
      onNavigate('overview');
      toast('Business workspace created');
      return;
    }
    const idx = Number(pick) - 1;
    if (!Number.isInteger(idx) || !businesses[idx]) { toast('Choose a listed number or type NEW'); return; }
    switchBusiness(businesses[idx].id);
    onNavigate('overview');
    toast('Business switched');
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[998] bg-black/30 md:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-[999] w-[248px] flex-col border-r border-line bg-white ${open ? 'flex' : 'hidden md:flex'}`}>
        {/* brand */}
        <div className="flex items-center gap-3 px-5 pb-7 pt-6">
          <BrandLockup />
        </div>

        {/* business switcher */}
        <button
          onClick={handleSwitch}
          className="mx-3 mb-4 flex items-center gap-2.5 rounded-xl border border-line px-3 py-3 text-left transition hover:bg-[#f7f8f5]"
        >
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#f5eee3] text-[17px]"><Store size={17} className="text-[#a07d3a]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold text-ink">{data.settings.businessName}</span>
            <span className="block text-[11px] text-muted">Retail · {data.settings.country}</span>
          </span>
          <ChevronDown size={15} className="text-[#9aa49d]" />
        </button>

        {/* nav */}
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#9aa49d]">Workspace</div>
        <nav className="grid min-h-0 flex-1 gap-1 overflow-y-auto px-3 pb-2">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { onNavigate(n.id); onClose(); }}
                className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition ${
                  active ? 'bg-brand-100 font-bold text-brand' : 'text-[#78827b] hover:bg-[#f7f8f5] hover:text-ink'
                }`}
              >
                <Icon size={16} className={active ? 'text-brand' : 'text-[#9aa49d]'} />
                {n.label}
              </button>
            );
          })}
          <div className="px-1 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[1.2px] text-[#9aa49d]">Setup</div>
          <button
            onClick={() => { onNavigate('settings'); onClose(); }}
            className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition ${
              page === 'settings' ? 'bg-brand-100 font-bold text-brand' : 'text-[#78827b] hover:bg-[#f7f8f5] hover:text-ink'
            }`}
          >
            <SettingsIcon size={16} className={page === 'settings' ? 'text-brand' : 'text-[#9aa49d]'} />
            Business settings
          </button>
        </nav>

        {/* bottom */}
        <div className="mx-3 mb-3 mt-auto">
          <div className="rounded-xl bg-[#f7f8f5] p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <Sparkles size={13} className="text-brand-500" /> Your business, in focus
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">Vyavasya keeps the daily numbers together so you can spend more time growing.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-t border-line px-4 py-3.5">
          <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#d9e9db] text-[12px] font-bold text-brand">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-bold text-ink">{data.settings.owner || 'Business owner'}</div>
            <div className="text-[10px] text-muted">Business owner</div>
          </div>
          <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-[#87948b] transition hover:bg-[#f7f8f5] hover:text-danger"><LogOut size={15} /></button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-[#657168] md:hidden"
      aria-label="Open menu"
    >
      <Menu size={17} />
    </button>
  );
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="btn-primary shrink-0" onClick={onClick}>
      <Plus size={15} /> {label}
    </button>
  );
}
