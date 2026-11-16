import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { PageHead, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { Field, Modal } from '@/components/Modal';
import { Search, Minus, Plus as PlusIcon, ShoppingCart, Trash2, UserRound, Check, X, TriangleAlert } from 'lucide-react';

export function POS() {
  const { data, posCheckout, addContact, toast } = useStore();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [lossConfirmationOpen, setLossConfirmationOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customerConsented, setCustomerConsented] = useState(false);
  const preferredAccount = data.accounts.find((x) => x.type === 'Cash') || data.accounts[0];
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>(preferredAccount?.type === 'Cash' ? 'Cash' : 'Online');
  const [accountId, setAccountId] = useState(String(preferredAccount?.id || ''));
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [paidNowInput, setPaidNowInput] = useState('');
  const cur = data.settings.currency;
  const paymentAccounts = data.accounts.filter((x) => paymentMethod === 'Cash' ? x.type === 'Cash' : x.type !== 'Cash');
  const selectedCustomer = data.contacts.find((x) => x.id === Number(customerId) && x.type === 'Customer');
  const customerMatches = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return data.contacts.filter((x) => x.type === 'Customer' && (!term
      || x.name.toLowerCase().includes(term)
      || x.phone.toLowerCase().includes(term)
      || (digits.length > 0 && x.phone.replace(/\D/g, '').includes(digits)))).slice(0, 8);
  }, [customerSearch, data.contacts]);

  const choosePaymentMethod = (method: 'Cash' | 'Online') => {
    setPaymentMethod(method);
    const choices = data.accounts.filter((x) => method === 'Cash' ? x.type === 'Cash' : x.type !== 'Cash');
    setAccountId((current) => choices.some((x) => String(x.id) === current) ? current : String(choices[0]?.id || ''));
  };

  const saveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerConsented) { toast('Confirm the customer agreed to save their details'); return; }
    const normalizedPhone = newCustomerPhone.replace(/\D/g, '');
    if (!normalizedPhone) { toast('Enter a valid phone number'); return; }
    const existing = data.contacts.find((x) => x.type === 'Customer' && x.phone.replace(/\D/g, '') === normalizedPhone);
    if (existing) {
      setCustomerId(String(existing.id));
      toast('That customer is already saved; selected them for this sale');
    } else {
      const id = addContact({ name: newCustomerName.trim(), type: 'Customer', phone: newCustomerPhone.trim(), balance: 0, balanceType: 'They owe me' });
      setCustomerId(String(id));
      toast('Customer saved and selected');
    }
    setShowCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setCustomerConsented(false);
  };

  const products = useMemo(() => {
    const q = query.toLowerCase();
    return data.items.filter((x) => `${x.name} ${x.sku || ''}`.toLowerCase().includes(q));
  }, [data.items, query]);

  const cartLines = useMemo(() => Object.entries(cart)
    .map(([id, storedQty]) => {
      const itemId = Number(id);
      const draft = quantityDrafts[itemId];
      const parsedDraft = draft === undefined || !draft.trim() ? storedQty : Number(draft);
      return { item: data.items.find((x) => x.id === itemId), qty: Number.isFinite(parsedDraft) ? parsedDraft : storedQty };
    })
    .filter((x) => x.item) as { item: typeof data.items[number]; qty: number }[], [cart, data.items, quantityDrafts]);

  const count = cartLines.length;
  const subtotal = cartLines.reduce((a, x) => a + x.qty * (x.item.retail || x.item.cost), 0);
  const discountEntry = discountValue.trim() === '' ? 0 : Number(discountValue);
  const discountInvalid = !Number.isFinite(discountEntry) || discountEntry < 0 || (discountType === 'percent' ? discountEntry > 100 : discountEntry > subtotal);
  const discountAmount = Math.min(subtotal, Math.max(0, discountType === 'percent' ? subtotal * discountEntry / 100 : discountEntry));
  const total = Math.max(0, subtotal - discountAmount);
  const estimatedCost = cartLines.reduce((sum, line) => sum + line.qty * Number(line.item.cost || 0), 0);
  const estimatedLoss = Math.max(0, estimatedCost - total);
  const saleAtLoss = estimatedLoss > 0.005;
  const paidNow = paidNowInput.trim() === '' ? total : Number(paidNowInput);
  const paidInvalid = !Number.isFinite(paidNow) || paidNow < 0 || paidNow > total;
  const dueAmount = Math.max(0, total - (Number.isFinite(paidNow) ? paidNow : 0));

  const addToCart = (itemId: number) => {
    const item = data.items.find((x) => x.id === itemId);
    if (!item) return;
    const now = cart[itemId] || 0;
    const next = now === 0 && item.qty < 1 ? item.qty : now + 1;
    if (next > item.qty) { toast('Not enough stock available'); return; }
    setCart({ ...cart, [itemId]: next });
  };
  const changeQty = (itemId: number, delta: number) => {
    const item = data.items.find((x) => x.id === itemId);
    if (!item) return;
    const next = (cart[itemId] || 0) + delta;
    if (next <= 0) { const c = { ...cart }; delete c[itemId]; setCart(c); setQuantityDrafts(({ [itemId]: _removed, ...drafts }) => drafts); return; }
    if (delta > 0 && next > item.qty) { toast('Not enough stock available'); return; }
    setCart({ ...cart, [itemId]: next });
    setQuantityDrafts(({ [itemId]: _removed, ...drafts }) => drafts);
  };
  const commitQuantity = (itemId: number) => {
    const draft = quantityDrafts[itemId];
    if (draft === undefined) return;
    const item = data.items.find((x) => x.id === itemId);
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) {
      setQuantityDrafts(({ [itemId]: _removed, ...drafts }) => drafts);
      return;
    }
    if (!item || value > item.qty) {
      toast('Quantity is greater than available stock');
      setQuantityDrafts(({ [itemId]: _removed, ...drafts }) => drafts);
      return;
    }
    setCart({ ...cart, [itemId]: value });
    setQuantityDrafts(({ [itemId]: _removed, ...drafts }) => drafts);
  };
  const clearCart = () => { setCart({}); setQuantityDrafts({}); };

  const completeSale = () => {
    const res = posCheckout({
      lines: cartLines.map(({ item, qty }) => ({ itemId: item.id, quantity: qty })),
      customerId: customerId ? Number(customerId) : null,
      accountId: accountId ? Number(accountId) : null,
      discountAmount: Math.round(discountAmount * 100) / 100,
      paidNow: Math.round(paidNow * 100) / 100,
    });
    if (!res.ok) { toast(res.error || 'Checkout failed'); return; }
    toast(dueAmount > 0 ? `Sale saved; ${money(dueAmount, cur)} added to customer balance` : `Sale completed; ${paymentMethod.toLowerCase()} payment recorded`);
    setCart({});
    setQuantityDrafts({});
    setDiscountType('amount');
    setDiscountValue('0');
    setPaidNowInput('');
  };

  const checkout = () => {
    if (saleAtLoss) { setLossConfirmationOpen(true); return; }
    completeSale();
  };

  const confirmLossSale = () => {
    setLossConfirmationOpen(false);
    completeSale();
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Fast checkout"
        title="Counter / POS"
        subhead="Add items to a sale and update stock when you check out."
        action={<button className="btn-secondary" onClick={clearCart}><Trash2 size={14} /> Clear cart</button>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        {/* Products */}
        <Panel
          title="Shop items"
          subtitle="Tap an item to add it to the current bill"
          action={
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa49d]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU…" className="h-[34px] w-[120px] rounded-lg border border-line bg-white py-0 pl-7 pr-2.5 text-[11px] outline-none focus:border-brand-400 sm:w-[180px]" />
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-3 lg:grid-cols-3" style={{ minHeight: 260, alignContent: 'start' }}>
            {products.length === 0 ? (
              <div className="col-span-full"><EmptyState message="No matching items. Add inventory first." /></div>
            ) : products.map((x) => (
              <button
                key={x.id} onClick={() => addToCart(x.id)} disabled={x.qty <= 0}
                className="rounded-[11px] border border-line bg-white p-3 text-left transition hover:border-brand-300 hover:bg-[#fbfdfb] disabled:opacity-50"
                style={{ minHeight: 150 }}
              >
                <div className="mb-2 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-[#f5f4ed] text-[34px]">
                  {x.photo ? <img src={x.photo} alt={x.name} loading="lazy" className="h-full w-full object-cover" /> : x.emoji || '📦'}
                </div>
                <div className="text-[11px] font-bold text-ink">{x.name}</div>
                <div className="mt-1 text-[10px] text-muted">{x.qty} {x.unit || 'pcs'} available{x.sku ? ` · ${x.sku}` : ''}</div>
                <div className="mt-1.5 font-bold text-brand">{money(x.retail || x.cost, cur)}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Cart */}
        <Panel title="Current sale" subtitle={count ? `${count} product${count === 1 ? '' : 's'} in this bill` : 'No items added'} action={<Badge tone="neutral">Draft bill</Badge>}>
          <div className="min-h-[130px] flex-1 px-[18px] py-2">
            {cartLines.length === 0 ? (
              <EmptyState message="Choose items to start a sale." />
            ) : cartLines.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center gap-2.5 border-b border-[#eff1ed] py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f5f4ed] text-[20px]">
                  {item.photo ? <img src={item.photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : item.emoji || '📦'}
                </span>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-ink">{item.name}</div>
                  <div className="text-[9px] text-muted">{money(item.retail || item.cost, cur)} / {item.unit || 'pcs'}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeQty(item.id, -1)} className="grid h-[23px] w-[23px] place-items-center rounded border border-line text-brand"><Minus size={12} /></button>
                  <input aria-label={`Quantity in ${item.unit || 'pieces'}`} className="h-[27px] w-[58px] rounded border border-line bg-white px-1 text-center text-[11px] font-bold text-ink" type="number" min="0.01" step="any" value={quantityDrafts[item.id] ?? String(qty)} onChange={(e) => setQuantityDrafts({ ...quantityDrafts, [item.id]: e.target.value })} onBlur={() => commitQuantity(item.id)} />
                  <button onClick={() => changeQty(item.id, 1)} className="grid h-[23px] w-[23px] place-items-center rounded border border-line text-brand"><PlusIcon size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-[18px] py-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="pos-customer" className="text-[10px] text-muted">Customer</label>
              <button type="button" onClick={() => setShowCustomerForm(true)} className="text-[10px] font-bold text-brand-500">+ Save customer</button>
            </div>
            <div className="relative mt-1.5">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[#9aa49d]" />
              <input
                id="pos-customer"
                type="search"
                autoComplete="off"
                value={customerSearch}
                onFocus={() => setCustomerSearchOpen(true)}
                onChange={(e) => { setCustomerSearch(e.target.value); setCustomerId(''); setCustomerSearchOpen(true); }}
                onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setCustomerSearchOpen(false); }}
                placeholder="Search customer name or phone…"
                className="h-[36px] w-full rounded-lg border border-line bg-white pl-8 pr-9 text-[11px] outline-none focus:border-brand-400"
              />
              {customerSearch && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setCustomerSearch(''); setCustomerId(''); setCustomerSearchOpen(false); }} aria-label="Clear customer search" className="absolute right-2 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-[#f3f5f1]"><X size={13} /></button>}
              {customerSearchOpen && <div className="absolute left-0 right-0 top-[40px] z-30 max-h-56 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lg">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setCustomerId(''); setCustomerSearch(''); setCustomerSearchOpen(false); }} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] transition hover:bg-[#f7f8f5] ${!customerId ? 'text-brand' : 'text-ink'}`}>
                  <UserRound size={13} /><span className="flex-1 font-semibold">Walk-in customer</span>{!customerId && <Check size={13} />}
                </button>
                {customerMatches.length > 0 ? customerMatches.map((customer) => <button key={customer.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setCustomerId(String(customer.id)); setCustomerSearch(customer.name); setCustomerSearchOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] transition hover:bg-[#f7f8f5]">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand">{customer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{customer.name}</span><span className="block truncate text-[9px] text-muted">{customer.phone || 'No phone saved'}</span></span>
                  {Number(customerId) === customer.id && <Check size={13} className="text-brand" />}
                </button>) : <p className="px-3 py-2 text-[10px] text-muted">No saved customers match that name or phone.</p>}
              </div>}
            </div>
            <div className="mt-1.5 flex min-h-5 items-center justify-between text-[9px] text-muted">
              {selectedCustomer ? <span>Sale for <b className="text-ink">{selectedCustomer.name}</b>{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}</span> : <span>Walk-in customer (not saved)</span>}
              {selectedCustomer && <button type="button" onClick={() => setCustomerId('')} className="font-semibold text-brand-500">Clear</button>}
            </div>
            <div className="mt-2.5">
              <div className="mb-1.5 text-[10px] text-muted">Payment method</div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#f3f5f1] p-1">
                {(['Cash', 'Online'] as const).map((method) => <button key={method} type="button" onClick={() => choosePaymentMethod(method)} className={`rounded-md py-2 text-[10px] font-bold ${paymentMethod === method ? 'bg-white text-brand shadow-sm' : 'text-[#7d8881]'}`}>{method === 'Cash' ? 'Cash' : 'Online / wallet'}</button>)}
              </div>
              <label className="mt-2 grid gap-1.5 text-[10px] text-muted">{paymentMethod === 'Cash' ? 'Cash drawer' : 'Bank or mobile wallet'}
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-[34px] rounded-lg border border-line bg-white px-2.5 text-[11px] outline-none focus:border-brand-400">
                  <option value="">Choose account</option>
                  {paymentAccounts.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.type}</option>)}
                </select>
              </label>
              {paidNow > 0 && paymentAccounts.length === 0 ? <p className="mt-1.5 text-[9px] text-amber-700">Add a {paymentMethod === 'Cash' ? 'cash' : 'bank or mobile wallet'} account in Accounts to record this payment.</p> : paymentMethod === 'Online' && paidNow > 0 && <p className="mt-1.5 text-[9px] text-muted">Records an online payment you have received; checkout does not process the payment.</p>}
            </div>
            <div className="my-3.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#46584c]">Discount</span>
              <div className="flex w-[190px] gap-1.5">
                <input aria-label="Discount value" className="field-input h-[34px] text-right" type="number" min="0" max={discountType === 'percent' ? 100 : subtotal} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
                <select aria-label="Discount type" className="field-select h-[34px] w-[76px] px-2" value={discountType} onChange={(event) => setDiscountType(event.target.value as 'amount' | 'percent')}>
                  <option value="amount">{cur}</option><option value="percent">%</option>
                </select>
              </div>
            </div>
            {discountInvalid && <p className="-mt-2 mb-2 text-right text-[10px] font-semibold text-danger">Discount must be between zero and the subtotal.</p>}
            <div className="space-y-1.5 border-t border-line pt-2.5 text-[11px]">
              <div className="flex justify-between text-[#46584c]"><span>Subtotal</span><span>{money(subtotal, cur)}</span></div>
              <div className="flex justify-between text-[#46584c]"><span>Discount</span><span>− {money(discountAmount, cur)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 text-[13px] font-bold text-ink"><span>Bill total</span><span>{money(total, cur)}</span></div>
            </div>
            <label className="mt-3 grid gap-1 text-[10px] font-medium text-[#46584c]">Payment received now
              <input className="field-input" type="number" min="0" max={total} step="0.01" placeholder={`Full amount (${money(total, cur)})`} value={paidNowInput} onChange={(event) => setPaidNowInput(event.target.value)} />
            </label>
            {paidInvalid && <p className="mt-1 text-[10px] font-semibold text-danger">Enter an amount from zero to the bill total.</p>}
            {dueAmount > 0 && !selectedCustomer && <p className="mt-1 rounded-lg bg-[#fff3e7] px-2.5 py-2 text-[10px] font-semibold text-[#87500a]">Choose or save a customer to record the {money(dueAmount, cur)} balance due.</p>}
            {saleAtLoss && <div className="mt-2 rounded-lg border border-[#f0c9c1] bg-[#fff3f0] px-3 py-2.5 text-[10px] leading-relaxed text-[#8e3d31]"><span className="inline-flex items-center gap-1.5 font-bold"><TriangleAlert size={13} /> Sale below cost</span><p className="mt-1">After the discount, this bill is {money(estimatedLoss, cur)} below the estimated cost of the items.</p></div>}
            <div className="mt-2 flex justify-between rounded-lg bg-[#f1f7f3] px-3 py-2 text-[12px] font-bold text-[#164b39]"><span>To collect</span><span>{money(dueAmount, cur)}</span></div>
            <button className={`btn-primary mt-3 w-full ${saleAtLoss ? '!bg-[#a94738] hover:!bg-[#8e3d31]' : ''}`} onClick={checkout} disabled={cartLines.length === 0 || discountInvalid || paidInvalid || (dueAmount > 0 && !selectedCustomer) || (paidNow > 0 && !accountId)}>
              {saleAtLoss ? <><TriangleAlert size={15} /> Review loss warning</> : <><ShoppingCart size={15} /> Complete sale</>}
            </button>
            <p className="mt-2 text-center text-[9px] text-[#9aa49d]">Checkout records revenue, cost of goods, stock, and selected account.</p>
          </div>
        </Panel>
      </div>
      <Callout><b className="text-brand">Counter-ready:</b> This browser MVP supports keyboard search and item selection. Barcode devices, receipt printers and cash drawers require hardware permissions or a desktop app.</Callout>

      <Modal open={showCustomerForm} onClose={() => setShowCustomerForm(false)} title="Save a customer">
        <form onSubmit={saveNewCustomer} className="space-y-3.5 p-5">
          <Field label="Customer name"><input className="field-input" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required autoFocus placeholder="Full name" /></Field>
          <Field label="Phone number"><input className="field-input" type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} required placeholder="Phone number" /></Field>
          <label className="flex items-start gap-2 rounded-lg bg-[#f7f8f5] p-3 text-[10px] leading-relaxed text-[#59645e]">
            <input type="checkbox" checked={customerConsented} onChange={(e) => setCustomerConsented(e.target.checked)} className="mt-0.5 accent-[#2b8060]" />
            The customer agreed to save their name and phone number for future purchases.
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCustomerForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save and select</button>
          </div>
        </form>
      </Modal>
      <Modal open={lossConfirmationOpen} onClose={() => setLossConfirmationOpen(false)} title="This sale will be at a loss" width="max-w-md">
        <div className="p-5">
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f0c9c1] bg-[#fff3f0] p-3.5 text-[#8e3d31]">
            <TriangleAlert size={19} className="mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed">After applying the discount, the amount charged is lower than the recorded cost of the items. Confirm only if you intend to accept this loss.</p>
          </div>
          <div className="space-y-2 rounded-lg bg-[#f7f8f5] p-3.5 text-[12px]">
            <div className="flex justify-between text-[#46584c]"><span>Items' estimated cost</span><b>{money(estimatedCost, cur)}</b></div>
            <div className="flex justify-between text-[#46584c]"><span>Bill after discount</span><b>{money(total, cur)}</b></div>
            <div className="flex justify-between border-t border-line pt-2 font-bold text-[#963f32]"><span>Estimated loss</span><span>{money(estimatedLoss, cur)}</span></div>
          </div>
          <p className="mt-2 text-[10px] text-muted">This estimate uses the unit costs saved in Inventory.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setLossConfirmationOpen(false)}>Go back</button>
            <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-[#a94738] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#8e3d31]" onClick={confirmLossSale}>Confirm sale anyway</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
