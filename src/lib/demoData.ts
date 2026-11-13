import type { AppData, Settings } from './types';

export const STORAGE_KEY = 'vyavasya-v2';
export const BUSINESS_KEY = 'vyavasya-v2-businesses';
export const ACTIVE_KEY = 'vyavasya-v2-active';

export const defaultSettings: Settings = {
  businessName: 'My Business',
  businessType: '',
  owner: '',
  ownerEmail: '',
  dateOfBirth: '',
  permanentAddress: '',
  temporaryAddress: '',
  country: 'Nepal',
  currency: 'NPR',
  calendar: 'AD',
  invoicePrefix: 'INV',
  fiscalYear: '2083/84',
};

export function emptyData(overrides: Partial<AppData> = {}): AppData {
  return {
    transactions: [],
    contacts: [],
    items: [],
    invoices: [],
    purchases: [],
    accounts: [
      { id: Date.now() + 1, name: 'Cash drawer', type: 'Cash', balance: 0 },
    ],
    settings: { ...defaultSettings },
    ...overrides,
  };
}

export function demoData(): AppData {
  const now = new Date();
  const d = (offset: number) => {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };
  return {
    accounts: [
      { id: 1, name: 'Cash drawer', type: 'Cash', balance: 42850 },
      { id: 2, name: 'Nabil Bank · 2314', type: 'Bank', balance: 125400 },
    ],
    contacts: [
      { id: 1, name: 'Ramesh Shrestha', type: 'Customer', phone: '9801234567', balance: 3200, balanceType: 'They owe me', last: 'Today', notes: 'Regular weekly buyer.' },
      { id: 2, name: 'Maya Gurung', type: 'Customer', phone: '9812345678', balance: 0, balanceType: 'They owe me', last: '8 Nov' },
      { id: 3, name: 'Everest Wholesale', type: 'Supplier', phone: '01-4567890', balance: 0, balanceType: 'I owe them', last: '10 Nov' },
      { id: 4, name: 'Himalayan Distributors', type: 'Supplier', phone: '9841234567', balance: 7400, balanceType: 'I owe them', last: '6 Nov' },
    ],
    items: [
      { id: 1, name: 'Masala tea · 500 g', sku: 'TEA-500', category: 'Grocery', qty: 4, reorder: 8, cost: 180, retail: 240, wholesale: 210, emoji: '🍵' },
      { id: 2, name: 'Basmati rice · 5 kg', sku: 'RICE-5K', category: 'Grains', qty: 18, reorder: 10, cost: 620, retail: 720, wholesale: 660, emoji: '🌾' },
      { id: 3, name: 'Mustard oil · 1 L', sku: 'OIL-1L', category: 'Cooking oil', qty: 6, reorder: 8, cost: 270, retail: 335, wholesale: 300, emoji: '🫙' },
      { id: 4, name: 'Lentils · 1 kg', sku: 'LNT-1K', category: 'Grains', qty: 22, reorder: 10, cost: 160, retail: 200, wholesale: 180, emoji: '🫘' },
      { id: 5, name: 'Laundry soap', sku: 'SOAP-1', category: 'Household', qty: 3, reorder: 12, cost: 55, retail: 75, wholesale: 65, emoji: '🧼' },
    ],
    transactions: [
      { id: 1, name: 'Walk-in sales', type: 'Sale', category: 'Retail sales', date: d(0), amount: 8750, status: 'Paid', paidAmount: 8750, accountId: 1, itemId: null, quantity: null },
      { id: 2, name: 'Everest Wholesale', type: 'Purchase', category: 'Inventory', date: d(1), amount: 12600, status: 'Paid', paidAmount: 12600, accountId: 2, itemId: null, quantity: null },
      { id: 3, name: 'Ramesh Shrestha', type: 'Sale', category: 'Retail sales', date: d(1), amount: 3200, status: 'Due', paidAmount: 0, accountId: null, itemId: null, quantity: null },
      { id: 4, name: 'Shop electricity', type: 'Expense', category: 'Utilities', date: d(2), amount: 1850, status: 'Paid', paidAmount: 1850, accountId: 1, itemId: null, quantity: null },
      { id: 5, name: 'Maya Gurung', type: 'Payment in', category: 'General', date: d(3), amount: 2000, status: 'Paid', paidAmount: 2000, accountId: 1, itemId: null, quantity: null },
      { id: 6, name: 'Local transport', type: 'Expense', category: 'Transport', date: d(4), amount: 650, status: 'Paid', paidAmount: 650, accountId: 1, itemId: null, quantity: null },
    ],
    invoices: [
      {
        id: 1,
        ref: 'INV-0001',
        contactName: 'Maya Gurung',
        kind: 'Invoice',
        date: d(3),
        due: d(-4),
        lines: [{ description: 'Grocery basket (assorted)', quantity: 1, unitPrice: 2400 }],
        amount: 2400,
        paidAmount: 2400,
        status: 'Paid',
        posted: true,
        accountId: 1,
      },
      {
        id: 2,
        ref: 'QUO-0001',
        contactName: 'Ramesh Shrestha',
        kind: 'Quotation',
        date: d(1),
        due: d(-6),
        lines: [{ description: 'Festival supply pack', quantity: 1, unitPrice: 5400 }],
        amount: 5400,
        paidAmount: 0,
        status: 'Sent',
        posted: false,
        accountId: null,
      },
    ],
    purchases: [
      {
        id: 1,
        ref: 'PO-0001',
        contactName: 'Everest Wholesale',
        kind: 'Purchase order',
        date: d(1),
        lines: [
          { description: 'Basmati rice · 5 kg', quantity: 10, unitPrice: 620 },
          { description: 'Mustard oil · 1 L', quantity: 10, unitPrice: 270 },
        ],
        amount: 8900,
        paidAmount: 0,
        status: 'Sent',
        received: false,
        accountId: null,
      },
    ],
    settings: { ...defaultSettings },
  };
}

export function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const base = emptyData();
  if (!raw) return base;
  return {
    transactions: Array.isArray(raw.transactions) ? raw.transactions : base.transactions,
    contacts: Array.isArray(raw.contacts) ? raw.contacts : base.contacts,
    items: Array.isArray(raw.items) ? raw.items : base.items,
    invoices: Array.isArray(raw.invoices) ? raw.invoices : base.invoices,
    purchases: Array.isArray(raw.purchases) ? raw.purchases : base.purchases,
    accounts: Array.isArray(raw.accounts) && raw.accounts.length ? raw.accounts : base.accounts,
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}
