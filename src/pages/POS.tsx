import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { PageHead, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { Search, Minus, Plus as PlusIcon, ShoppingCart, Trash2 } from 'lucide-react';

export function POS() {
  const { data, posCheckout, toast } = useStore();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customerId, setCustomerId] = useState('');
  const [accountId, setAccountId] = useState(String(data.accounts[0]?.id || ''));
  const cur = data.settings.currency;

  const products = useMemo(() => {
    const q = query.toLowerCase();
    return data.items.filter((x) => `${x.name} ${x.sku || ''}`.toLowerCase().includes(q));
  }, [data.items, query]);

  const cartLines = useMemo(() => Object.entries(cart)
    .map(([id, qty]) => ({ item: data.items.find((x) => x.id === Number(id)), qty }))
    .filter((x) => x.item) as { item: typeof data.items[number]; qty: number }[], [cart, data.items]);

  const count = cartLines.reduce((a, x) => a + x.qty, 0);
  const total = cartLines.reduce((a, x) => a + x.qty * (x.item.retail || x.item.cost), 0);

  const addToCart = (itemId: number) => {
    const item = data.items.find((x) => x.id === itemId);
    if (!item) return;
    const now = cart[itemId] || 0;
    if (now >= item.qty) { toast('Not enough stock available'); return; }
    setCart({ ...cart, [itemId]: now + 1 });
  };
  const changeQty = (itemId: number, delta: number) => {
    const item = data.items.find((x) => x.id === itemId);
    if (!item) return;
    const next = (cart[itemId] || 0) + delta;
    if (next <= 0) { const c = { ...cart }; delete c[itemId]; setCart(c); return; }
    if (delta > 0 && next > item.qty) { toast('Not enough stock available'); return; }
    setCart({ ...cart, [itemId]: next });
  };
  const clearCart = () => setCart({});

  const checkout = () => {
    const res = posCheckout({
      lines: Object.entries(cart).map(([id, qty]) => ({ itemId: Number(id), quantity: qty })),
      customerId: customerId ? Number(customerId) : null,
      accountId: accountId ? Number(accountId) : null,
    });
    if (!res.ok) { toast(res.error || 'Checkout failed'); return; }
    toast('Sale completed; stock and account balance updated');
    setCart({});
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
                style={{ minHeight: 105 }}
              >
                <div className="mb-2 text-[20px]">{x.emoji || '📦'}</div>
                <div className="text-[11px] font-bold text-ink">{x.name}</div>
                <div className="mt-1 text-[10px] text-muted">{x.qty} available{x.sku ? ` · ${x.sku}` : ''}</div>
                <div className="mt-1.5 font-bold text-brand">{money(x.retail || x.cost, cur)}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Cart */}
        <Panel title="Current sale" subtitle={count ? `${count} item${count === 1 ? '' : 's'} in this bill` : 'No items added'} action={<Badge tone="neutral">Draft bill</Badge>}>
          <div className="min-h-[130px] flex-1 px-[18px] py-2">
            {cartLines.length === 0 ? (
              <EmptyState message="Choose items to start a sale." />
            ) : cartLines.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center gap-2.5 border-b border-[#eff1ed] py-2.5">
                <span className="text-[18px]">{item.emoji || '📦'}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-ink">{item.name}</div>
                  <div className="text-[9px] text-muted">{money(item.retail || item.cost, cur)} each</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeQty(item.id, -1)} className="grid h-[23px] w-[23px] place-items-center rounded border border-line text-brand"><Minus size={12} /></button>
                  <span className="min-w-[12px] text-center text-[11px] font-bold">{qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} className="grid h-[23px] w-[23px] place-items-center rounded border border-line text-brand"><PlusIcon size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-[18px] py-3.5">
            <label className="grid gap-1.5 text-[10px] text-muted">Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-[34px] rounded-lg border border-line bg-white px-2.5 text-[11px] outline-none focus:border-brand-400">
                <option value="">Walk-in customer</option>
                {data.contacts.filter((x) => x.type === 'Customer').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="mt-2.5 grid gap-1.5 text-[10px] text-muted">Deposit account
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-[34px] rounded-lg border border-line bg-white px-2.5 text-[11px] outline-none focus:border-brand-400">
                <option value="">Choose cash or bank</option>
                {data.accounts.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.type}</option>)}
              </select>
            </label>
            <div className="my-3.5 flex items-center justify-between">
              <span className="text-[12px] text-[#78827b]">Total</span>
              <b className="font-display text-[20px] font-bold text-ink">{money(total, cur)}</b>
            </div>
            <button className="btn-primary w-full" onClick={checkout} disabled={cartLines.length === 0}>
              <ShoppingCart size={15} /> Complete sale
            </button>
            <p className="mt-2 text-center text-[9px] text-[#9aa49d]">Checkout records revenue, cost of goods, stock, and selected account.</p>
          </div>
        </Panel>
      </div>
      <Callout><b className="text-brand">Counter-ready:</b> This browser MVP supports keyboard search and item selection. Barcode devices, receipt printers and cash drawers require hardware permissions or a desktop app.</Callout>
    </div>
  );
}
