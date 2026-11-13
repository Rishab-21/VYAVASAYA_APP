import type { DaySeries } from '@/lib/calc';

export function SalesChart({ series }: { series: DaySeries[] }) {
  const max = Math.max(1, ...series.flatMap((x) => [x.sales, x.expenses]));
  const step = max < 1000 ? Math.max(1, Math.ceil(max / 3)) : Math.max(1, Math.ceil(max / 3 / 1000) * 1000);
  const top = step * 3;
  const W = 680, H = 190;
  const padL = 45, padR = 15, padB = 32, padT = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (i * plotW) / (series.length - 1);
  const y = (v: number) => padT + plotH - (v / top) * plotH;

  const salesPts = series.map((d, i) => `${x(i)},${y(d.sales)}`);
  const expPts = series.map((d, i) => `${x(i)},${y(d.expenses)}`);
  const areaPts = [`${x(0)},${padT + plotH}`, ...salesPts, `${x(series.length - 1)},${padT + plotH}`];

  return (
    <div className="px-[18px] pb-2 pt-3.5" style={{ height: 225 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="salesFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2d8060" stopOpacity="0.18" />
            <stop offset="1" stopColor="#2d8060" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const gy = padT + (plotH * (3 - i)) / 3;
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#edf0eb" strokeWidth="1" />
              <text x="2" y={gy + 4} fill="#929c95" fontSize="10" fontFamily="DM Sans">{(step * i).toLocaleString('en-IN')}</text>
            </g>
          );
        })}
        <polygon points={areaPts.join(' ')} fill="url(#salesFade)" />
        <polyline points={salesPts.join(' ')} fill="none" stroke="#2b8060" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="animate-chartline" />
        <polyline points={expPts.join(' ')} fill="none" stroke="#e8a24d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {series.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.sales)} r="2.5" fill="#fff" stroke="#2b8060" strokeWidth="2" />
        ))}
        {series.map((d, i) => (
          <text key={i} x={x(i)} y={H - 10} fill="#929c95" fontSize="10" fontFamily="DM Sans" textAnchor="middle">{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex gap-[18px] px-5 pb-[17px] text-[10px] text-[#7e8982]">
      <span className="flex items-center gap-1.5"><i className="h-[7px] w-[7px] rounded-full bg-brand-500" /> Sales</span>
      <span className="flex items-center gap-1.5"><i className="h-[7px] w-[7px] rounded-full bg-accent" /> Expenses</span>
    </div>
  );
}
