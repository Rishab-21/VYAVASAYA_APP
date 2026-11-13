import { type ReactNode } from 'react';

export function PageHead({ eyebrow, title, subhead, action }: { eyebrow?: string; title: string; subhead?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">{eyebrow}</p>}
        <h1 className="font-display text-[22px] font-bold tracking-tight text-ink sm:text-[25px]">{title}</h1>
        {subhead && <p className="mt-1.5 text-[12px] text-muted">{subhead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, icon, value, foot, tone = 'default' }: {
  label: string; icon: ReactNode; value: string; foot?: ReactNode; tone?: 'default' | 'positive' | 'negative';
}) {
  return (
    <article className="card min-h-[126px] p-[18px]">
      <div className="flex items-center justify-between text-[11px] text-[#7c8880]">
        <span>{label}</span>
        <span className="grid h-[29px] w-[29px] place-items-center rounded-[9px] bg-[#f3f5f1]">{icon}</span>
      </div>
      <div className="mb-1 mt-3 font-display text-[24px] font-bold tracking-tight text-ink">{value}</div>
      {foot && <div className={`text-[10px] ${tone === 'positive' ? 'text-[#3c9770]' : tone === 'negative' ? 'text-danger' : 'text-[#96a098]'}`}>{foot}</div>}
    </article>
  );
}

export function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-[17px]">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="mt-2 font-display text-[20px] font-bold tracking-tight text-ink">{value}</div>
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = '' }: {
  title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[#eff1ed] px-[19px] py-[17px]">
          <div>
            {title && <h2 className="font-display text-[14px] font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 text-[10px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`px-6 py-9 text-center text-[12px] text-muted ${className}`}>{message}</div>
  );
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'neutral' }) {
  const cls = tone === 'green' ? 'badge-green' : tone === 'amber' ? 'badge-amber' : tone === 'red' ? 'badge-red' : 'badge-neutral';
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-3.5 rounded-xl border border-[#e5eee4] bg-[#f1f7f1] px-[17px] py-[15px] text-[11px] leading-relaxed text-[#617166]">
      {children}
    </div>
  );
}
