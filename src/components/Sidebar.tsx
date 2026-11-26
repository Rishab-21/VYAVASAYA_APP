import { useState } from 'react';
import { useStore } from '@/lib/store';
import type { PageId } from '@/lib/types';
import { BrandLockup } from '@/components/BrandLogo';
import { canAccessPage } from '@/lib/access';
import {
  LayoutDashboard, ShoppingCart, ArrowLeftRight, Users, Package,
  FileText, ClipboardList, Wallet, BarChart3, Settings as SettingsIcon,
  Menu, ChevronDown, Store, Handshake, Plus, LogOut, UserCog,
} from 'lucide-react';

interface NavItem { id: PageId; label: string; icon: typeof LayoutDashboard; }
const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pos', label: 'Counter / POS', icon: ShoppingCart },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'contacts', label: 'Customers', icon: Users },
  { id: 'commercial', label: 'Suppliers & purchases', icon: Handshake },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'invoices', label: 'Invoices & quotations', icon: FileText },
  { id: 'purchases', label: 'Purchase orders', icon: ClipboardList },
  { id: 'accounts', label: 'Cash & accounts', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'staff', label: 'Staff management', icon: UserCog },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function Sidebar({ page, onNavigate, open, onClose, onSignOut }: SidebarProps) {
  const { data, businesses, businessId, accessRole, switchBusiness, addBusiness, toast } = useStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [addingBusiness, setAddingBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');

  const initials = data.settings.owner.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'BO';

  const chooseBusiness = (id: string) => {
    switchBusiness(id);
    setSwitcherOpen(false);
    onNavigate('overview');
    onClose();
    if (id !== businessId) toast('Business switched');
  };

  const createBusiness = () => {
    const name = newBusinessName.trim();
    if (!name) { toast('Enter a name for this shop'); return; }
    addBusiness(name);
    setNewBusinessName('');
    setAddingBusiness(false);
    setSwitcherOpen(false);
    onNavigate('overview');
    onClose();
    toast('New business added to your account');
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
        <div className="relative mx-3 mb-4">
          <button
            onClick={() => { setSwitcherOpen((value) => !value); setAddingBusiness(false); }}
            aria-expanded={switcherOpen}
            aria-haspopup="true"
            className="flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-3 text-left transition hover:bg-[#f7f8f5]"
          >
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#f5eee3] text-[17px]"><Store size={17} className="text-[#a07d3a]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-ink">{data.settings.businessName}</span>
              <span className="block text-[11px] text-muted">{businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} · {data.settings.country}</span>
            </span>
            <ChevronDown size={15} className={`text-[#68766d] transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
          </button>
          {switcherOpen && (
            <div className="absolute left-0 right-0 top-full z-[1001] mt-2 overflow-hidden rounded-xl border border-line bg-white p-2 shadow-[0_14px_35px_rgba(20,45,30,0.16)]">
              <p className="px-2 pb-2 pt-1 text-[11px] font-semibold text-[#68766d]">Your businesses</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {businesses.map((business) => (
                  <button key={business.id} onClick={() => chooseBusiness(business.id)} aria-current={business.id === businessId ? 'true' : undefined} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[13px] transition ${business.id === businessId ? 'bg-[#dceee2] font-bold text-[#164b39] shadow-[inset_3px_0_0_#1b5c45]' : 'font-medium text-[#45554b] hover:bg-[#f1f5f1]'}`}>
                    <Store size={15} className={`shrink-0 ${business.id === businessId ? 'text-[#1b5c45]' : ''}`} />
                    <span className="min-w-0 flex-1 truncate">{business.name}</span>
                    {business.id === businessId && <span className="text-[10px] font-semibold">Open</span>}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-line pt-2">
                {addingBusiness ? (
                  <form onSubmit={(event) => { event.preventDefault(); createBusiness(); }} className="space-y-2 p-1">
                    <label htmlFor="new-business-name" className="block text-[11px] font-semibold text-[#45554b]">Shop or branch name</label>
                    <input id="new-business-name" autoFocus maxLength={80} className="field-input" placeholder="e.g. D-Mart · Dhangadhi" value={newBusinessName} onChange={(event) => setNewBusinessName(event.target.value)} />
                    <p className="text-[10px] leading-relaxed text-[#68766d]">Each shop gets its own sales, stock, customers, and reports under this account.</p>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary flex-1" onClick={() => { setAddingBusiness(false); setNewBusinessName(''); }}>Cancel</button>
                      <button type="submit" className="btn-primary flex-1"><Plus size={14} /> Add shop</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setAddingBusiness(true)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-bold text-brand-700 transition hover:bg-brand-50">
                    <Plus size={16} /> Add another business
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* nav */}
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#9aa49d]">Workspace</div>
        <nav className="grid min-h-0 flex-1 gap-1 overflow-y-auto px-3 pb-2">
          {navItems.filter((item) => canAccessPage(accessRole, item.id)).map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { onNavigate(n.id); onClose(); }}
                className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition ${
                  active ? 'bg-[#dceee2] font-bold text-[#164b39] shadow-[inset_3px_0_0_#1b5c45]' : 'font-medium text-[#536359] hover:bg-[#f1f5f1] hover:text-ink'
                }`}
              >
                <Icon size={16} className={active ? 'text-brand' : 'text-[#9aa49d]'} />
                {n.label}
              </button>
            );
          })}
          <div className="px-1 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[1.2px] text-[#9aa49d]">Setup</div>
          {canAccessPage(accessRole, 'settings') && <button
            onClick={() => { onNavigate('settings'); onClose(); }}
            className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition ${
              page === 'settings' ? 'bg-[#dceee2] font-bold text-[#164b39] shadow-[inset_3px_0_0_#1b5c45]' : 'font-medium text-[#536359] hover:bg-[#f1f5f1] hover:text-ink'
            }`}
          >
            <SettingsIcon size={16} className={page === 'settings' ? 'text-brand' : 'text-[#9aa49d]'} />
            Business settings
          </button>}
        </nav>

        {/* bottom */}
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
