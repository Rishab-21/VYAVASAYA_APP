export function BrandMark({ className = '', title = 'Vyavasya mark' }: { className?: string; title?: string }) {
  return <img className={className} src="/vyavasaya-mark-exact.png" alt={title} />;
}

export function BrandArtwork({ className = '' }: { className?: string }) {
  return <img className={className} src="/vyavasaya-lockup.png" alt="Vyavasaya Business Management App" />;
}

export function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-[#f1fae9] to-[#deefdf] shadow-[0_6px_22px_rgba(93,183,115,0.2)] ring-1 ring-white/60">
        <BrandMark className="h-9 w-9" />
      </span>
      <img className="h-auto w-[128px]" src="/vyavasaya-wordmark.png" alt="VYAVASAYA Business Management App" />
    </div>
  );
}
