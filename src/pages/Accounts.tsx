import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { PageHead, SummaryBox, Panel, EmptyState, Badge, Callout } from '@/components/ui';
import { AccountModal } from '@/components/AccountModal';
import { Plus, Wallet, Landmark, Smartphone } from 'lucide-react';

const typeIcon = (t: string) => t === 'Bank' ? Landmark : t === 'Mobile wallet' ? Smartphone : Wallet;

export function Accounts() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const cur = data.settings.currency;
  const totalBalance = useMemo(() => data.accounts.reduce((a, x) => a + x.balance, 0), [data.accounts]);

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Money movement"
        title="Cash & accounts"
        subhead="Keep a simple view of cash drawers and bank balances, and record money moving between them."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add account</button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryBox label="Accounts" value={String(data.accounts.length)} />
        <SummaryBox label="Total recorded balance" value={money(totalBalance, cur)} />
        <SummaryBox label="Last updated" value="Today" />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.accounts.length === 0 ? (
          <div className="col-span-full"><Panel><EmptyState message="No accounts yet. Add one to start tracking balances." /></Panel></div>
        ) : data.accounts.map((a) => {
          const Icon = typeIcon(a.type);
          return (
            <div key={a.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand"><Icon size={18} /></span>
                <Badge tone="neutral">{a.type}</Badge>
              </div>
              <div className="text-[12px] font-semibold text-ink">{a.name}</div>
              <div className="mt-2 font-display text-[24px] font-bold tracking-tight text-ink">{money(a.balance, cur)}</div>
              <div className="mt-1 text-[10px] text-muted">Current recorded balance</div>
            </div>
          );
        })}
      </div>

      <Callout><b className="text-brand">Bank feeds are not connected.</b> Account balances here are entered manually and updated by your transactions; a production version needs secure bank integrations and reconciliation.</Callout>
      <AccountModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
