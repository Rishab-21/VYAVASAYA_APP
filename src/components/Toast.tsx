import { useStore } from '@/lib/store';
import { CheckCircle2 } from 'lucide-react';

export function Toast() {
  const { toastMsg } = useStore();
  if (!toastMsg) return null;
  return (
    <div className="animate-toast fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-xl bg-[#213a2d] px-4 py-3 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <CheckCircle2 size={17} className="text-[#7fd1a3]" />
      {toastMsg}
    </div>
  );
}
