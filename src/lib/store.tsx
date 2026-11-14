import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type {
  AppData, Transaction, Contact, Item, Invoice, Purchase, Account,
  Settings, BusinessWorkspace, TxnType, TxnStatus,
} from './types';
import {
  STORAGE_KEY, BUSINESS_KEY, ACTIVE_KEY, demoData, emptyData, normalizeData,
} from './demoData';
import { readWorkspaces, replaceWorkspaces, writeWorkspace } from './database';
import { roundMoney, localDateKey, nextId } from './format';
import { useAuth } from './auth';
import { readCloudWorkspaces, writeCloudWorkspaces } from './supabaseWorkspaces';

interface ToastFn { (msg: string): void; }

interface StoreValue {
  data: AppData;
  businessId: string;
  businesses: BusinessWorkspace[];
  toast: ToastFn;
  toastMsg: string | null;
  // settings
  updateSettings: (s: Partial<Settings>) => void;
  switchBusiness: (id: string) => void;
  addBusiness: (name: string) => void;
  resetDemo: () => void;
  importBackup: (json: string) => boolean;
  exportBackup: () => string;
  // transactions
  addTransaction: (input: TxnInput) => { ok: boolean; error?: string };
  // contacts
  addContact: (c: Omit<Contact, 'id' | 'last'>) => number;
  updateContact: (id: number, patch: Partial<Contact>) => void;
  // items
  addItem: (i: Omit<Item, 'id' | 'emoji'> & { emoji?: string }) => void;
  updateItem: (id: number, patch: Partial<Item>) => void;
  importItems: (rows: Item[]) => void;
  // pos
  posCheckout: (input: PosInput) => { ok: boolean; error?: string };
  // invoices
  addInvoice: (i: InvoiceInput) => { ok: boolean; error?: string };
  postInvoice: (id: number) => { ok: boolean; error?: string };
  // purchases
  addPurchase: (p: PurchaseInput) => { ok: boolean; error?: string };
  receivePurchase: (id: number) => { ok: boolean; error?: string };
  // accounts
  addAccount: (a: Omit<Account, 'id'>) => void;
}

interface TxnInput {
  name: string;
  type: TxnType;
  category: string;
  date: string;
  amount: number;
  status: TxnStatus;
  paidNow: number;
  accountId: number | null;
  itemId: number | null;
  quantity: number;
  notes?: string;
}

interface PosInput {
  lines: { itemId: number; quantity: number }[];
  customerId: number | null;
  accountId: number | null;
}

interface InvoiceInput {
  contactName: string;
  kind: Invoice['kind'];
  date: string;
  due: string;
  lines: { description: string; quantity: number; unitPrice: number }[];
  paidAmount: number;
  status: Invoice['status'];
  accountId: number | null;
}

interface PurchaseInput {
  contactName: string;
  kind: Purchase['kind'];
  date: string;
  lines: { description: string; quantity: number; unitPrice: number }[];
  paidAmount: number;
  status: Purchase['status'];
  accountId: number | null;
}

const StoreContext = createContext<StoreValue | null>(null);
interface StorageKeys { data: string; businesses: string; active: string; sampleMigration: string; }

function storageKeys(scope: string): StorageKeys {
  if (scope === 'local') return {
    data: STORAGE_KEY, businesses: BUSINESS_KEY, active: ACTIVE_KEY,
    sampleMigration: 'vyavasya-v2-sample-cleaned',
  };
  return {
    data: `${STORAGE_KEY}:${scope}`,
    businesses: `${BUSINESS_KEY}:${scope}`,
    active: `${ACTIVE_KEY}:${scope}`,
    sampleMigration: `vyavasya-v2-sample-cleaned:${scope}`,
  };
}

function loadBusinesses(key: string): BusinessWorkspace[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function isUntouchedSample(data: AppData): boolean {
  return data.transactions.length === 6 && data.contacts.length === 4
    && data.items.length === 5 && data.invoices.length === 2 && data.purchases.length === 1
    && data.transactions.map((row) => row.name).join('|') === 'Walk-in sales|Everest Wholesale|Ramesh Shrestha|Shop electricity|Maya Gurung|Local transport'
    && data.contacts.map((row) => row.name).join('|') === 'Ramesh Shrestha|Maya Gurung|Everest Wholesale|Himalayan Distributors'
    && data.items.map((row) => row.sku).join('|') === 'TEA-500|RICE-5K|OIL-1L|LNT-1K|SOAP-1'
    && data.invoices.map((row) => row.ref).join('|') === 'INV-0001|QUO-0001'
    && data.purchases[0]?.ref === 'PO-0001';
}

function persist(keys: StorageKeys, scope: string, businesses: BusinessWorkspace[], activeId: string, data: AppData) {
  localStorage.setItem(keys.data, JSON.stringify(data));
  const slot = businesses.find((b) => b.id === activeId);
  if (slot) {
    slot.name = data.settings.businessName;
    slot.data = data;
  } else {
    businesses.push({ id: activeId, name: data.settings.businessName, data });
  }
  localStorage.setItem(keys.businesses, JSON.stringify(businesses));
  localStorage.setItem(keys.active, activeId);
  void writeWorkspace(scope, activeId, data.settings.businessName, data).catch(() => {
    // LocalStorage remains available if IndexedDB is disabled by the browser.
  });
}

export function StoreProvider({ children, scope = 'local' }: { children: ReactNode; scope?: string }) {
  const { client, user } = useAuth();
  const keys = useMemo(() => storageKeys(scope), [scope]);
  const [businesses, setBusinesses] = useState<BusinessWorkspace[]>(() => {
    const book = loadBusinesses(keys.businesses);
    if (!book.length) {
      const initial = emptyData();
      const book0 = [{ id: 'main', name: initial.settings.businessName, data: initial }];
      localStorage.setItem(keys.businesses, JSON.stringify(book0));
      localStorage.setItem(keys.active, 'main');
      return book0;
    }
    const migrated = book.map((workspace) => isUntouchedSample(workspace.data)
      ? { ...workspace, data: emptyData({ settings: workspace.data.settings }) }
      : workspace);
    if (migrated.some((workspace, index) => workspace !== book[index])) {
      localStorage.setItem(keys.sampleMigration, '1');
      localStorage.setItem(keys.businesses, JSON.stringify(migrated));
      const activeId = localStorage.getItem(keys.active) || 'main';
      const active = migrated.find((workspace) => workspace.id === activeId);
      if (active) localStorage.setItem(keys.data, JSON.stringify(active.data));
    }
    return migrated;
  });

  const [businessId, setBusinessId] = useState<string>(() => localStorage.getItem(keys.active) || 'main');

  const [data, setData] = useState<AppData>(() => {
    const book = loadBusinesses(keys.businesses);
    const activeId = localStorage.getItem(keys.active) || 'main';
    const slot = book.find((b) => b.id === activeId);
    if (slot) return normalizeData(slot.data);
    return emptyData();
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ owner: string; bootstrapping: boolean; enabled: boolean } | null>(null);
  const localChanges = useRef(false);
  const initialBusinesses = useRef(businesses);

  useEffect(() => {
    let active = true;
    if (localStorage.getItem(keys.sampleMigration) === '1') {
      localStorage.removeItem(keys.sampleMigration);
      void replaceWorkspaces(scope, initialBusinesses.current).catch(() => {}).finally(() => {
        if (active) setDatabaseReady(true);
      });
      return () => { active = false; };
    }
    void readWorkspaces(scope).then((saved) => {
      if (!active) return;
      if (saved?.length && !localChanges.current) {
        const selectedId = localStorage.getItem(keys.active) || 'main';
        const selected = saved.find((workspace) => workspace.id === selectedId) || saved[0];
        setBusinesses(saved);
        setBusinessId(selected.id);
        setData(normalizeData(selected.data));
        localStorage.setItem(keys.businesses, JSON.stringify(saved));
        localStorage.setItem(keys.active, selected.id);
        localStorage.setItem(keys.data, JSON.stringify(selected.data));
      } else if (!saved?.length) {
        void replaceWorkspaces(scope, initialBusinesses.current).catch(() => {});
      }
      setDatabaseReady(true);
    }).catch(() => {
      setDatabaseReady(true);
    });
    return () => { active = false; };
  }, [keys, scope]);

  useEffect(() => {
    if (!databaseReady || !client || !user) {
      setCloudStatus(null);
      return;
    }
    let active = true;
    setCloudStatus({ owner: user.id, bootstrapping: true, enabled: false });
    void readCloudWorkspaces(client, user.id).then(async (remote) => {
      if (!active) return;
      if (remote.length) {
        const selectedId = localStorage.getItem(keys.active) || 'main';
        const selected = remote.find((workspace) => workspace.id === selectedId) || remote[0];
        await replaceWorkspaces(scope, remote);
        if (!active) return;
        setBusinesses(remote);
        setBusinessId(selected.id);
        setData(normalizeData(selected.data));
        localStorage.setItem(keys.businesses, JSON.stringify(remote));
        localStorage.setItem(keys.active, selected.id);
        localStorage.setItem(keys.data, JSON.stringify(selected.data));
      } else {
        const metadata = user.user_metadata || {};
        const local = loadBusinesses(keys.businesses).map((workspace) => {
          const nextData = normalizeData(workspace.data);
          nextData.settings = {
            ...nextData.settings,
            businessName: typeof metadata.business_name === 'string' && metadata.business_name ? metadata.business_name : nextData.settings.businessName,
            businessType: typeof metadata.business_type === 'string' ? metadata.business_type : nextData.settings.businessType,
            owner: typeof metadata.full_name === 'string' ? metadata.full_name : nextData.settings.owner,
            ownerEmail: typeof metadata.contact_email === 'string' ? metadata.contact_email : nextData.settings.ownerEmail,
            dateOfBirth: typeof metadata.date_of_birth === 'string' ? metadata.date_of_birth : nextData.settings.dateOfBirth,
            permanentAddress: typeof metadata.permanent_address === 'string' ? metadata.permanent_address : nextData.settings.permanentAddress,
            temporaryAddress: typeof metadata.temporary_address === 'string' ? metadata.temporary_address : nextData.settings.temporaryAddress,
          };
          return { ...workspace, name: nextData.settings.businessName, data: nextData };
        });
        await replaceWorkspaces(scope, local);
        if (!active) return;
        const activeWorkspace = local.find((workspace) => workspace.id === (localStorage.getItem(keys.active) || 'main')) || local[0];
        setBusinesses(local);
        if (activeWorkspace) {
          setBusinessId(activeWorkspace.id);
          setData(normalizeData(activeWorkspace.data));
          localStorage.setItem(keys.active, activeWorkspace.id);
          localStorage.setItem(keys.data, JSON.stringify(activeWorkspace.data));
        }
        localStorage.setItem(keys.businesses, JSON.stringify(local));
        await writeCloudWorkspaces(client, user.id, local);
      }
      if (active) setCloudStatus({ owner: user.id, bootstrapping: false, enabled: true });
    }).catch(() => {
      // Keep the device copy available if the project or table is not configured yet.
      if (active) setCloudStatus({ owner: user.id, bootstrapping: false, enabled: false });
    });
    return () => { active = false; };
  }, [client, databaseReady, keys, scope, user]);

  useEffect(() => {
    if (!client || !user || cloudStatus?.owner !== user.id || cloudStatus.bootstrapping || !cloudStatus.enabled) return;
    void writeCloudWorkspaces(client, user.id, businesses).catch(() => {
      // Keep local data usable if the device is offline; the next edit retries the sync.
    });
  }, [businesses, client, cloudStatus, user]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout((toast as ToastFn & { _t?: number })._t);
    (toast as ToastFn & { _t?: number })._t = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const save = useCallback((next: AppData) => {
    localChanges.current = true;
    setData(next);
    setBusinesses((prev) => {
      const updated = [...prev];
      persist(keys, scope, updated, businessId, next);
      return updated;
    });
  }, [businessId, keys, scope]);

  // keep localStorage in sync if another tab changes it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === keys.data && e.newValue) {
        try {
          setData(normalizeData(JSON.parse(e.newValue)));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [keys.data]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    save({ ...data, settings: { ...data.settings, ...s } });
  }, [data, save]);

  const switchBusiness = useCallback((id: string) => {
    const slot = businesses.find((b) => b.id === id);
    if (!slot) return;
    setBusinessId(id);
    localChanges.current = true;
    setData(normalizeData(slot.data));
    localStorage.setItem(keys.data, JSON.stringify(slot.data));
    localStorage.setItem(keys.active, id);
  }, [businesses, keys.data, keys.active]);

  const addBusiness = useCallback((name: string) => {
    const id = 'biz-' + Date.now();
    const fresh = emptyData();
    fresh.settings = { ...fresh.settings, businessName: name, owner: data.settings.owner };
    const next = [...businesses, { id, name, data: fresh }];
    localChanges.current = true;
    setBusinesses(next);
    setBusinessId(id);
    setData(fresh);
    localStorage.setItem(keys.data, JSON.stringify(fresh));
    localStorage.setItem(keys.businesses, JSON.stringify(next));
    localStorage.setItem(keys.active, id);
    void replaceWorkspaces(scope, next).catch(() => {});
  }, [businesses, data.settings.owner, keys, scope]);

  const resetDemo = useCallback(() => {
    save(demoData());
  }, [save]);

  const importBackup = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.transactions || !parsed.items) return false;
      save(normalizeData(parsed));
      return true;
    } catch {
      return false;
    }
  }, [save]);

  const exportBackup = useCallback(() => JSON.stringify(data, null, 2), [data]);

  // ---- Transactions ----
  const addTransaction = useCallback((inp: TxnInput): { ok: boolean; error?: string } => {
    const amount = roundMoney(inp.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount greater than zero.' };
    if (!inp.name.trim()) return { ok: false, error: 'Enter a description or contact name.' };

    const contacts = data.contacts;
    const party = contacts.find((p) => p.name.trim().toLowerCase() === inp.name.trim().toLowerCase());
    const item = inp.itemId ? data.items.find((x) => x.id === inp.itemId) : null;
    const account = inp.accountId ? data.accounts.find((a) => a.id === inp.accountId) : null;

    if (inp.type === 'Sale' && inp.status !== 'Paid' && (!party || party.type !== 'Customer'))
      return { ok: false, error: 'Choose an existing customer for an unpaid sale.' };
    if (inp.type === 'Purchase' && inp.status !== 'Paid' && (!party || party.type !== 'Supplier'))
      return { ok: false, error: 'Choose an existing supplier for an unpaid purchase.' };
    if (inp.type === 'Expense' && inp.status !== 'Paid' && (!party || party.type !== 'Supplier'))
      return { ok: false, error: 'Choose a supplier contact for an unpaid expense.' };
    if (inp.status === 'Part-paid' && (inp.paidNow <= 0 || inp.paidNow >= amount))
      return { ok: false, error: 'For a part-paid entry, the amount paid must be above zero and below the total.' };
    if (inp.status === 'Due' && inp.paidNow > 0)
      return { ok: false, error: 'Set status to Part-paid to record a partial payment.' };
    if (inp.paidNow > 0 && !account)
      return { ok: false, error: 'Choose a cash or bank account for the amount paid.' };

    let paidNow = inp.paidNow;
    if (inp.status === 'Paid') paidNow = amount;
    if (inp.type !== 'Payment in' && inp.type !== 'Payment out') paidNow = Math.min(amount, paidNow);
    paidNow = roundMoney(paidNow);

    if (inp.type === 'Payment in' && party && party.type === 'Customer' && amount > party.balance)
      return { ok: false, error: 'This payment is greater than the recorded customer balance.' };
    if (inp.type === 'Payment out' && party && party.type === 'Supplier' && amount > party.balance)
      return { ok: false, error: 'This payment is greater than the recorded supplier balance.' };

    if (item && (inp.type === 'Sale' || inp.type === 'Purchase')) {
      if (!Number.isFinite(inp.quantity) || inp.quantity <= 0) return { ok: false, error: 'Enter a quantity greater than zero.' };
      if (inp.type === 'Sale' && inp.quantity > item.qty)
        return { ok: false, error: 'This sale is larger than available stock.' };
    }

    const outstanding = Math.max(0, roundMoney(amount - paidNow));
    const next: AppData = {
      ...data,
      transactions: [...data.transactions],
      items: data.items.map((x) => ({ ...x })),
      contacts: data.contacts.map((c) => ({ ...c })),
      accounts: data.accounts.map((a) => ({ ...a })),
    };

    const row: Transaction = {
      id: nextId(next.transactions),
      name: inp.name.trim(),
      type: inp.type,
      category: inp.category,
      date: inp.date,
      amount,
      status: inp.status,
      paidAmount: paidNow,
      accountId: account?.id ?? null,
      contactId: party?.id ?? null,
      itemId: item?.id ?? null,
      quantity: item ? inp.quantity : null,
      notes: inp.notes,
    };

    if (item && inp.type === 'Sale') {
      const it = next.items.find((x) => x.id === item.id)!;
      it.qty = roundMoney(it.qty - inp.quantity);
      row.lineItems = [{
        itemId: item.id, name: item.name, quantity: inp.quantity, unit: item.unit || 'pcs',
        unitPrice: roundMoney(amount / inp.quantity),
        costTotal: roundMoney(inp.quantity * Number(item.cost || 0)),
      }];
    }
    if (item && inp.type === 'Purchase') {
      const it = next.items.find((x) => x.id === item.id)!;
      it.qty = roundMoney(it.qty + inp.quantity);
    }

    if (account && paidNow > 0) {
      const acc = next.accounts.find((a) => a.id === account.id)!;
      const inflow = inp.type === 'Sale' || inp.type === 'Payment in';
      const outflow = inp.type === 'Purchase' || inp.type === 'Expense' || inp.type === 'Payment out';
      if (inflow) acc.balance = roundMoney(acc.balance + paidNow);
      if (outflow) acc.balance = roundMoney(acc.balance - paidNow);
    }

    if (party) {
      const p = next.contacts.find((c) => c.id === party.id)!;
      if (inp.type === 'Sale' && p.type === 'Customer' && outstanding > 0) {
        p.balanceType = 'They owe me';
        p.balance = roundMoney(p.balance + outstanding);
      }
      if ((inp.type === 'Purchase' || inp.type === 'Expense') && p.type === 'Supplier' && outstanding > 0) {
        p.balanceType = 'I owe them';
        p.balance = roundMoney(p.balance + outstanding);
      }
      if (inp.type === 'Payment in' && p.type === 'Customer') {
        p.balance = roundMoney(p.balance - amount);
        p.balanceType = 'They owe me';
      }
      if (inp.type === 'Payment out' && p.type === 'Supplier') {
        p.balance = roundMoney(p.balance - amount);
        p.balanceType = 'I owe them';
      }
      p.last = 'Today';
    }

    next.transactions.push(row);
    save(next);
    return { ok: true };
  }, [data, save]);

  // ---- Contacts ----
  const addContact = useCallback((c: Omit<Contact, 'id' | 'last'>) => {
    const id = nextId(data.contacts);
    save({
      ...data,
      contacts: [...data.contacts, { ...c, id, last: 'Today' }],
    });
    return id;
  }, [data, save]);

  const updateContact = useCallback((id: number, patch: Partial<Contact>) => {
    save({
      ...data,
      contacts: data.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }, [data, save]);

  // ---- Items ----
  const addItem = useCallback((i: Omit<Item, 'id' | 'emoji'> & { emoji?: string }) => {
    save({
      ...data,
      items: [...data.items, { ...i, id: nextId(data.items), emoji: i.emoji || '📦' }],
    });
  }, [data, save]);

  const updateItem = useCallback((id: number, patch: Partial<Item>) => {
    save({
      ...data,
      items: data.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }, [data, save]);

  const importItems = useCallback((rows: Item[]) => {
    save({ ...data, items: [...data.items, ...rows] });
  }, [data, save]);

  // ---- POS ----
  const posCheckout = useCallback((inp: PosInput): { ok: boolean; error?: string } => {
    if (!inp.lines.length) return { ok: false, error: 'Add an item before completing a sale.' };
    if (!inp.accountId) return { ok: false, error: 'Choose a cash or bank account before checkout.' };
    for (const l of inp.lines) {
      const it = data.items.find((x) => x.id === l.itemId);
      if (!it || !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > it.qty) return { ok: false, error: 'Stock changed. Review the cart before checkout.' };
    }
    const next: AppData = {
      ...data,
      transactions: [...data.transactions],
      items: data.items.map((x) => ({ ...x })),
      accounts: data.accounts.map((a) => ({ ...a })),
      contacts: data.contacts.map((c) => ({ ...c })),
    };
    const lineItems = inp.lines.map((l) => {
      const it = next.items.find((x) => x.id === l.itemId)!;
      it.qty = roundMoney(it.qty - l.quantity);
      return {
        itemId: it.id, name: it.name, quantity: l.quantity, unit: it.unit || 'pcs',
        unitPrice: Number(it.retail || it.cost || 0),
        costTotal: roundMoney(l.quantity * Number(it.cost || 0)),
      };
    });
    const sum = roundMoney(lineItems.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
    const account = next.accounts.find((a) => a.id === inp.accountId)!;
    account.balance = roundMoney(account.balance + sum);
    const customer = inp.customerId ? next.contacts.find((c) => c.id === inp.customerId) : null;
    if (customer) customer.last = 'Today';
    next.transactions.push({
      id: nextId(next.transactions),
      name: customer?.name || 'Walk-in customer',
      type: 'Sale',
      category: 'Retail sales',
      date: localDateKey(),
      amount: sum,
      status: 'Paid',
      paidAmount: sum,
      accountId: account.id,
      contactId: customer?.id ?? null,
      itemId: null,
      quantity: null,
      lineItems,
    });
    save(next);
    return { ok: true };
  }, [data, save]);

  // ---- Invoices ----
  const addInvoice = useCallback((inp: InvoiceInput): { ok: boolean; error?: string } => {
    const amount = roundMoney(inp.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
    if (amount <= 0) return { ok: false, error: 'Add at least one line with a quantity and price.' };
    if (inp.kind === 'Invoice' && inp.status !== 'Draft') {
      const c = data.contacts.find((p) => p.type === 'Customer' && p.name.trim().toLowerCase() === inp.contactName.trim().toLowerCase());
      if (!c) return { ok: false, error: 'Choose an existing customer before issuing an invoice.' };
    }
    let paid = roundMoney(inp.paidAmount);
    if (inp.kind === 'Invoice' && inp.status === 'Paid') paid = amount;
    if (inp.kind === 'Invoice' && inp.status === 'Sent') paid = 0;
    if (inp.kind === 'Invoice' && inp.status === 'Part-paid' && (paid <= 0 || paid >= amount))
      return { ok: false, error: 'Enter a payment amount between zero and the invoice total.' };
    if (inp.kind === 'Invoice' && paid > 0 && !inp.accountId)
      return { ok: false, error: 'Choose an account for the amount received.' };

    const prefix = inp.kind === 'Quotation' ? 'QUO'
      : inp.kind === 'Credit note / return' ? 'CRN'
      : inp.kind === 'Sales order' ? 'SO'
      : data.settings.invoicePrefix || 'INV';
    const serial = String(data.invoices.length + 1).padStart(4, '0');

    const invoice: Invoice = {
      id: nextId(data.invoices),
      ref: `${prefix}-${serial}`,
      contactName: inp.contactName.trim() || 'Walk-in customer',
      kind: inp.kind,
      date: inp.date,
      due: inp.due,
      lines: inp.lines,
      amount,
      paidAmount: paid,
      status: inp.status,
      posted: false,
      accountId: inp.accountId,
    };
    const next: AppData = { ...data, invoices: [...data.invoices, invoice] };

    // post immediately if issued (non-draft invoice)
    if (invoice.kind === 'Invoice' && invoice.status !== 'Draft') {
      postInvoiceInto(next, invoice);
    }
    save(next);
    return { ok: true };
  }, [data, save]);

  const postInvoice = useCallback((id: number): { ok: boolean; error?: string } => {
    const inv = data.invoices.find((i) => i.id === id);
    if (!inv) return { ok: false, error: 'Invoice not found.' };
    if (inv.posted) return { ok: false, error: 'This invoice has already been posted.' };
    if (inv.kind !== 'Invoice') return { ok: false, error: 'Only invoices can be posted to sales.' };
    const next: AppData = {
      ...data,
      invoices: data.invoices.map((x) => ({ ...x })),
      transactions: [...data.transactions],
      contacts: data.contacts.map((c) => ({ ...c })),
      accounts: data.accounts.map((a) => ({ ...a })),
    };
    const target = next.invoices.find((i) => i.id === id)!;
    postInvoiceInto(next, target);
    save(next);
    return { ok: true };
  }, [data, save]);

  // ---- Purchases ----
  const addPurchase = useCallback((inp: PurchaseInput): { ok: boolean; error?: string } => {
    const amount = roundMoney(inp.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
    if (amount <= 0) return { ok: false, error: 'Add at least one line with a quantity and price.' };
    const prefix = inp.kind === 'Supplier bill' ? 'BILL' : inp.kind === 'Purchase return' ? 'PR' : 'PO';
    const serial = String(data.purchases.length + 1).padStart(4, '0');
    const purchase: Purchase = {
      id: nextId(data.purchases),
      ref: `${prefix}-${serial}`,
      contactName: inp.contactName.trim() || 'Supplier',
      kind: inp.kind,
      date: inp.date,
      lines: inp.lines,
      amount,
      paidAmount: roundMoney(inp.paidAmount),
      status: inp.status,
      received: false,
      accountId: inp.accountId,
    };
    const next: AppData = { ...data, purchases: [...data.purchases, purchase] };
    if (purchase.status === 'Received') {
      receivePurchaseInto(next, purchase);
    }
    save(next);
    return { ok: true };
  }, [data, save]);

  const receivePurchase = useCallback((id: number): { ok: boolean; error?: string } => {
    const pur = data.purchases.find((p) => p.id === id);
    if (!pur) return { ok: false, error: 'Purchase not found.' };
    if (pur.received) return { ok: false, error: 'This purchase has already been received.' };
    const next: AppData = {
      ...data,
      purchases: data.purchases.map((x) => ({ ...x })),
      items: data.items.map((x) => ({ ...x })),
      transactions: [...data.transactions],
      contacts: data.contacts.map((c) => ({ ...c })),
      accounts: data.accounts.map((a) => ({ ...a })),
    };
    const target = next.purchases.find((p) => p.id === id)!;
    receivePurchaseInto(next, target);
    save(next);
    return { ok: true };
  }, [data, save]);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    save({ ...data, accounts: [...data.accounts, { ...a, id: nextId(data.accounts) }] });
  }, [data, save]);

  const value: StoreValue = {
    data, businessId, businesses, toast, toastMsg,
    updateSettings, switchBusiness, addBusiness, resetDemo, importBackup, exportBackup,
    addTransaction, addContact, updateContact, addItem, updateItem, importItems,
    posCheckout, addInvoice, postInvoice, addPurchase, receivePurchase, addAccount,
  };

  if (!databaseReady) return null;
  if (cloudStatus?.bootstrapping) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f7f3] text-sm text-[#55715e]">Loading your saved business data…</div>;
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ---- helpers that mutate a draft AppData in place ----

function postInvoiceInto(next: AppData, inv: Invoice) {
  if (inv.posted) return;
  inv.posted = true;
  const outstanding = roundMoney(inv.amount - inv.paidAmount);
  const account = inv.accountId ? next.accounts.find((a) => a.id === inv.accountId) : null;
  const contact = next.contacts.find((p) => p.type === 'Customer' && p.name.trim().toLowerCase() === inv.contactName.trim().toLowerCase());
  next.transactions.push({
    id: nextId(next.transactions),
    name: inv.contactName,
    type: 'Sale',
    category: 'Invoice',
    date: inv.date,
    amount: inv.amount,
    status: outstanding === 0 ? 'Paid' : inv.paidAmount > 0 ? 'Part-paid' : 'Due',
    paidAmount: inv.paidAmount,
    accountId: account?.id ?? null,
    contactId: contact?.id ?? null,
    itemId: null,
    quantity: null,
  });
  if (contact && outstanding > 0) {
    contact.balanceType = 'They owe me';
    contact.balance = roundMoney(contact.balance + outstanding);
    contact.last = 'Today';
  }
  if (account && inv.paidAmount > 0) {
    account.balance = roundMoney(account.balance + inv.paidAmount);
  }
}

function receivePurchaseInto(next: AppData, pur: Purchase) {
  if (pur.received) return;
  pur.received = true;
  pur.status = 'Received';
  // increase stock for lines matching an item by name
  for (const line of pur.lines) {
    const it = next.items.find((x) => x.name.trim().toLowerCase() === line.description.trim().toLowerCase());
    if (it) it.qty = roundMoney(it.qty + line.quantity);
  }
  const outstanding = roundMoney(pur.amount - pur.paidAmount);
  const account = pur.accountId ? next.accounts.find((a) => a.id === pur.accountId) : null;
  next.transactions.push({
    id: nextId(next.transactions),
    name: pur.contactName,
    type: 'Purchase',
    category: 'Purchase order',
    date: pur.date,
    amount: pur.amount,
    status: outstanding === 0 ? 'Paid' : pur.paidAmount > 0 ? 'Part-paid' : 'Due',
    paidAmount: pur.paidAmount,
    accountId: account?.id ?? null,
    itemId: null,
    quantity: null,
  });
  const supplier = next.contacts.find((p) => p.type === 'Supplier' && p.name.trim().toLowerCase() === pur.contactName.trim().toLowerCase());
  if (supplier && outstanding > 0) {
    supplier.balanceType = 'I owe them';
    supplier.balance = roundMoney(supplier.balance + outstanding);
    supplier.last = 'Today';
  }
  if (account && pur.paidAmount > 0) {
    account.balance = roundMoney(account.balance - pur.paidAmount);
  }
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
