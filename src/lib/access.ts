import type { PageId, StaffRole } from './types';

const rolePages: Record<StaffRole, PageId[]> = {
  Administrator: ['overview', 'pos', 'transactions', 'contacts', 'commercial', 'inventory', 'invoices', 'purchases', 'accounts', 'reports', 'staff', 'settings'],
  Manager: ['overview', 'pos', 'transactions', 'contacts', 'commercial', 'inventory', 'invoices', 'purchases'],
  Cashier: ['overview', 'pos', 'contacts', 'inventory'],
  'Inventory clerk': ['overview', 'inventory'],
};

export function canAccessPage(role: 'Owner' | StaffRole, page: PageId) {
  return role === 'Owner' || rolePages[role].includes(page);
}
