export type Currency = 'NPR' | 'INR';
export type Country = 'Nepal' | 'India';

export type TxnType = 'Sale' | 'Purchase' | 'Expense' | 'Payment in' | 'Payment out';
export type TxnStatus = 'Paid' | 'Due' | 'Part-paid';

export interface LineItem {
  itemId: number;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  costTotal: number;
}

export interface Transaction {
  id: number;
  name: string;
  type: TxnType;
  category: string;
  date: string; // YYYY-MM-DD
  amount: number;
  status: TxnStatus;
  paidAmount: number;
  accountId: number | null;
  /** Contact record associated with this transaction, when selected. */
  contactId?: number | null;
  itemId: number | null;
  quantity: number | null;
  lineItems?: LineItem[];
  notes?: string;
}

export type ContactType = 'Customer' | 'Supplier';
export type BalanceType = 'They owe me' | 'I owe them';

export interface Contact {
  id: number;
  name: string;
  type: ContactType;
  phone: string;
  notes?: string;
  balance: number;
  balanceType: BalanceType;
  last: string;
}

export interface Item {
  id: number;
  name: string;
  sku: string;
  category: string;
  qty: number;
  /** Inventory quantity unit, e.g. pcs, kg, L, m, cylinder. */
  unit?: string;
  reorder: number;
  cost: number;
  retail: number;
  wholesale: number;
  emoji: string;
  /** Small client-compressed image data URL, stored with the workspace for offline use. */
  photo?: string;
}

export type DocKind =
  | 'Invoice'
  | 'Quotation'
  | 'Sales order'
  | 'Credit note / return';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Part-paid' | 'Paid';
export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}
export interface Invoice {
  id: number;
  ref: string;
  contactName: string;
  kind: DocKind;
  date: string;
  due: string;
  lines: InvoiceLine[];
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  posted: boolean; // whether sale/receivable has been posted
  accountId: number | null;
}

export type PurchaseKind = 'Purchase order' | 'Supplier bill' | 'Purchase return';
export type PurchaseStatus = 'Draft' | 'Sent' | 'Part received' | 'Received' | 'Paid';
export interface PurchaseLine {
  description: string;
  quantity: number;
  unitPrice: number;
}
export interface Purchase {
  id: number;
  ref: string;
  contactName: string;
  kind: PurchaseKind;
  date: string;
  lines: PurchaseLine[];
  amount: number;
  paidAmount: number;
  status: PurchaseStatus;
  received: boolean; // whether stock has been posted
  accountId: number | null;
}

export interface Account {
  id: number;
  name: string;
  type: 'Cash' | 'Bank' | 'Mobile wallet';
  balance: number;
}

export interface Settings {
  businessName: string;
  businessType: string;
  owner: string;
  ownerEmail: string;
  dateOfBirth: string;
  permanentAddress: string;
  temporaryAddress: string;
  country: Country;
  currency: Currency;
  calendar: 'AD' | 'BS';
  invoicePrefix: string;
  fiscalYear: string;
}

export interface AppData {
  transactions: Transaction[];
  contacts: Contact[];
  items: Item[];
  invoices: Invoice[];
  purchases: Purchase[];
  accounts: Account[];
  settings: Settings;
}

export interface BusinessWorkspace {
  id: string;
  name: string;
  data: AppData;
}

export type PageId =
  | 'overview'
  | 'pos'
  | 'transactions'
  | 'contacts'
  | 'inventory'
  | 'invoices'
  | 'purchases'
  | 'accounts'
  | 'reports'
  | 'settings';
