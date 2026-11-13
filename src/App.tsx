import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StoreProvider } from '@/lib/store';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Toast } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Contacts } from '@/pages/Contacts';
import { Inventory } from '@/pages/Inventory';
import { POS } from '@/pages/POS';
import { Invoices } from '@/pages/Invoices';
import { Purchases } from '@/pages/Purchases';
import { Accounts } from '@/pages/Accounts';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import type { PageId } from '@/lib/types';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Login } from '@/pages/Login';
import { BrandArtwork, BrandMark } from '@/components/BrandLogo';

const INTRO_KEY = 'vyavasya-intro-seen';

function shouldShowIntro() {
  try {
    return !sessionStorage.getItem(INTRO_KEY)
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function BrandIntro() {
  return (
    <div className="brand-intro" aria-hidden="true">
      <div className="brand-intro-content">
        <BrandArtwork className="brand-intro-full-logo" />
      </div>
    </div>
  );
}

function AppContent() {
  const [page, setPage] = useState<PageId>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(shouldShowIntro);
  const auth = useAuth();

  // Android WebView can restore the previous page's scroll offset after the
  // app remounts. The dashboard has a sticky header, so that leaves its title
  // and the top of its cards hidden behind the header on launch.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    let delayedReset = 0;
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      window.clearTimeout(delayedReset);
      // Android WebView may restore its previous scroll after the first frame.
      delayedReset = window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 120);
    };
    const resetOnResume = () => {
      if (document.visibilityState === 'visible') resetScroll();
    };
    resetScroll();
    window.addEventListener('pageshow', resetScroll);
    window.addEventListener('focus', resetScroll);
    document.addEventListener('visibilitychange', resetOnResume);
    return () => {
      window.clearTimeout(delayedReset);
      window.removeEventListener('pageshow', resetScroll);
      window.removeEventListener('focus', resetScroll);
      document.removeEventListener('visibilitychange', resetOnResume);
    };
  }, []);

  useEffect(() => {
    if (auth.loading || (!auth.user && !auth.preview) || page !== 'overview') return;
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const settle = window.setTimeout(resetScroll, 350);
    const settled = window.setTimeout(resetScroll, 900);
    const resetOnResume = () => {
      if (document.visibilityState === 'visible') resetScroll();
    };
    window.addEventListener('pageshow', resetScroll);
    document.addEventListener('visibilitychange', resetOnResume);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.clearTimeout(settled);
      window.removeEventListener('pageshow', resetScroll);
      document.removeEventListener('visibilitychange', resetOnResume);
    };
  }, [auth.loading, auth.user, auth.preview, page]);

  useEffect(() => {
    if (!introOpen) return;
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* intro is optional */ }
    const timeout = window.setTimeout(() => setIntroOpen(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [introOpen]);

  const navigate = (p: PageId) => { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); };

  if (auth.loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f7f3]"><BrandMark className="h-16 w-16 animate-pulse rounded-2xl bg-white p-1" title="Loading Vyavasya" /></div>;
  }

  if (!auth.user && !auth.preview) {
    return <><Login />{introOpen && <BrandIntro />}</>;
  }

  const storageScope = auth.user?.id ?? 'local';

  return (
    <>
      <StoreProvider key={storageScope} scope={storageScope}>
        <div className="min-h-screen md:pl-[248px]">
          <Sidebar page={page} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} onSignOut={() => void auth.signOut()} />
          <div className="flex min-h-screen flex-col">
            <Topbar page={page} onOpenMenu={() => setMenuOpen(true)} onOpenSettings={() => navigate('settings')} />
            <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 md:px-9 md:pb-14">
              {page === 'overview' && <Dashboard onNavigate={navigate} />}
              {page === 'pos' && <POS />}
              {page === 'transactions' && <Transactions />}
              {page === 'contacts' && <Contacts />}
              {page === 'inventory' && <Inventory />}
              {page === 'invoices' && <Invoices />}
              {page === 'purchases' && <Purchases />}
              {page === 'accounts' && <Accounts />}
              {page === 'reports' && <Reports />}
              {page === 'settings' && <Settings />}
            </main>
          </div>
          <Toast />
        </div>
      </StoreProvider>
      {introOpen && <BrandIntro />}
    </>
  );
}

function App() {
  return (
    <>
      <AuthProvider><AppContent /></AuthProvider>
      <Analytics />
    </>
  );
}

export default App;
