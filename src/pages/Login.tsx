import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CircleHelp, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, Smartphone, Sparkles } from 'lucide-react';
import { BrandArtwork, BrandMark } from '@/components/BrandLogo';
import { useAuth } from '@/lib/auth';

function normalizePhone(number: string, callingCode: string) {
  const code = callingCode.replace(/\D/g, '');
  const local = number.replace(/\D/g, '').replace(/^0+/, '');
  const combined = `${code}${local}`;
  return code.length >= 1 && code.length <= 3 && local.length >= 6 && combined.length >= 8 && combined.length <= 15
    ? `+${combined}`
    : null;
}

// Supabase Phone auth requires an SMS provider. Use a deterministic internal
// email identifier instead, while keeping the phone number as the user's ID in
// the interface. The .invalid domain is reserved and cannot receive mail.
function phoneLoginEmail(phone: string) {
  return `phone${phone.replace(/\D/g, '')}@accounts.vyavasya.invalid`;
}

const businessTypes = [
  'Agriculture and farming', 'Animal husbandry and livestock', 'Fishing and aquaculture',
  'Retail shop', 'Wholesale and distribution', 'Grocery and convenience store',
  'Food, restaurant and catering', 'Manufacturing and production', 'Construction and contracting',
  'Real estate and property', 'Transportation and logistics', 'Travel and tourism',
  'Hotel and hospitality', 'Education and training', 'Healthcare and pharmacy',
  'Professional services', 'Finance and accounting', 'Information technology',
  'Telecommunications', 'Media and entertainment', 'Arts, crafts and design',
  'Clothing and textiles', 'Beauty and personal care', 'Automotive and repair',
  'Home services and maintenance', 'Energy and utilities', 'Mining and natural resources',
  'Nonprofit and community organization', 'Online business and e-commerce',
  'Import and export', 'Other / not listed',
];

export function Login() {
  const { client, configured, previewAllowed, enterPreview } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [callingCode, setCallingCode] = useState('+977');
  const [phoneInput, setPhoneInput] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [otherBusinessType, setOtherBusinessType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phoneInput, callingCode);
    if (!normalized) {
      setError('Enter a valid mobile number. Nepal’s +977 code is filled in for you.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (!client) {
      setError('Account sign-in is not connected. Configure Supabase to create or access an account.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await client.auth.signUp({
          email: phoneLoginEmail(normalized),
          password,
          options: { data: {
            phone_number: normalized,
            login_method: 'phone_password',
            full_name: fullName.trim(),
            contact_email: contactEmail.trim().toLowerCase(),
            date_of_birth: dateOfBirth,
            permanent_address: permanentAddress.trim(),
            temporary_address: temporaryAddress.trim(),
            business_name: businessName.trim(),
            business_type: businessType === 'Other / not listed' ? otherBusinessType.trim() : businessType,
          } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setNotice('Your account is ready. You’re signed in.');
        } else {
          setMode('login');
          setPassword('');
          setNotice('Account created. Log in with your phone number and password.');
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email: phoneLoginEmail(normalized), password });
        if (signInError) throw signInError;
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not access your account. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f1] lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      <aside className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_18%_10%,#2c7555_0%,#174c3b_46%,#10372f_100%)] px-6 pb-[76px] pt-7 text-white sm:px-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-11 xl:px-[76px]">
        <div className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[440px] w-[440px] rounded-full border border-white/[0.08] sm:-right-10 sm:-top-44 sm:h-[520px] sm:w-[520px]" />
        <div className="pointer-events-none absolute -bottom-64 -left-48 -z-10 h-[560px] w-[560px] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute right-[-22px] top-12 -z-10 opacity-[0.3] sm:right-12 lg:right-[-18px] lg:top-[23%] lg:opacity-[0.42]">
          <div className="grid h-[190px] w-[190px] place-items-center rounded-[54px] bg-gradient-to-br from-[#d5f5a2]/30 to-[#3ed489]/5 shadow-[0_0_90px_rgba(161,232,104,0.25)] ring-1 ring-white/20 sm:h-[230px] sm:w-[230px] lg:h-[320px] lg:w-[320px]">
            <BrandMark className="h-[160px] w-[160px] drop-shadow-[0_12px_24px_rgba(159,233,103,0.45)] sm:h-[195px] sm:w-[195px] lg:h-[275px] lg:w-[275px]" />
          </div>
        </div>

        <BrandArtwork className="relative w-[150px] rounded-[12px] bg-[#f8f8f4] p-1 shadow-[0_10px_35px_rgba(0,0,0,0.14)] ring-1 ring-white/30 sm:w-[172px]" />

        <div className="relative mt-12 max-w-[610px] lg:my-auto lg:pb-12 lg:pt-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.09] px-3 py-1.5 text-[10px] font-bold text-[#def0df] shadow-sm backdrop-blur sm:mb-6 sm:text-[11px]">
            <Sparkles size={13} className="text-[#b1e676]" /> BUSINESS, IN BETTER VIEW
          </div>
          <h1 className="max-w-[560px] font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.055em] sm:text-[42px] lg:text-[54px] xl:text-[60px]">
            A clearer way<br className="hidden sm:block" /> to run your business.
          </h1>
          <p className="mt-3 max-w-[410px] text-[12px] leading-6 text-white/70 sm:mt-5 sm:text-[14px] sm:leading-7">
            Sign in to keep your sales, stock and cash records organized in one calm workspace.
          </p>
          <div className="mt-6 hidden max-w-[400px] grid-cols-2 gap-2.5 sm:grid">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3.5 backdrop-blur-sm">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-[#a5dc6d]/15 text-[#b9ed7b]"><Check size={16} /></div>
              <div className="text-[11px] font-bold text-white">Sales & expenses</div>
              <div className="mt-1 text-[10px] text-white/55">Know where today stands</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3.5 backdrop-blur-sm">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-[#a5dc6d]/15 text-[#b9ed7b]"><Smartphone size={15} /></div>
              <div className="text-[11px] font-bold text-white">Simple sign-in</div>
              <div className="mt-1 text-[10px] text-white/55">Phone number and password</div>
            </div>
          </div>
        </div>

        <div className="relative hidden items-center justify-between text-[10px] text-white/45 lg:flex">
          <span>Vyavasya · Business management app</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole size={12} /> Private sign-in</span>
        </div>
      </aside>

      <main className="relative z-10 -mt-12 flex min-h-[calc(100vh-220px)] items-start justify-center px-4 pb-8 sm:px-8 lg:mt-0 lg:min-h-screen lg:items-center lg:px-12 lg:py-10 xl:px-16">
        <div className={`w-full ${mode === 'signup' ? 'max-w-[620px]' : 'max-w-[456px]'}`}>
          <section className="overflow-hidden rounded-[24px] border border-[#e5ebe4] bg-white shadow-[0_24px_75px_rgba(27,64,43,0.12)] sm:rounded-[28px]">
            <div className="h-[5px] bg-gradient-to-r from-[#1b5c45] via-[#51a86d] to-[#b4e56d]" />
            <div className="p-6 sm:p-9 lg:p-10">
              <div className="mb-7 flex items-center justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf6ec] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#34764d] sm:text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#67b77b]" /> SECURE SIGN-IN
                </span>
              </div>

              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4a9663]">Welcome to Vyavasya</p>
              <h2 className="font-display text-[27px] font-extrabold leading-[1.12] tracking-[-0.045em] text-[#1f3029] sm:text-[32px]">{mode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h2>
              <p className="mt-2.5 text-[12px] leading-6 text-[#77837b] sm:text-[13px]">{mode === 'signup' ? 'Create your login, tell us about yourself and set up your business workspace.' : 'Log in with the mobile number and password linked to your account.'}</p>

              <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#f4f7f3] p-1">
                {(['login', 'signup'] as const).map((item) => (
                  <button key={item} type="button" onClick={() => { setMode(item); setError(''); setNotice(''); }} className={`rounded-[9px] py-2.5 text-[11px] font-bold transition ${mode === item ? 'bg-white text-[#285f42] shadow-sm' : 'text-[#7b887e] hover:text-[#435b49]'}`}>
                    {item === 'login' ? 'Log in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form className="mt-6 space-y-4" onSubmit={submit}>
                    {mode === 'signup' && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-[11px] font-bold text-[#45554b]">Full name
                            <input autoComplete="name" className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                          </label>
                          <label className="block text-[11px] font-bold text-[#45554b]">Email address
                            <input type="email" autoComplete="email" className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
                          </label>
                          <label className="block text-[11px] font-bold text-[#45554b]">Date of birth
                            <input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                          </label>
                          <label className="block text-[11px] font-bold text-[#45554b]">Business name
                            <input autoComplete="organization" className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                          </label>
                          <label className="block text-[11px] font-bold text-[#45554b] sm:col-span-2">Business type
                            <select className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={businessType} onChange={(e) => setBusinessType(e.target.value)} required>
                              <option value="" disabled>Select your business type</option>
                              {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </label>
                          {businessType === 'Other / not listed' && <label className="block text-[11px] font-bold text-[#45554b] sm:col-span-2">Tell us your business type
                            <input className="mt-1.5 h-[48px] w-full rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={otherBusinessType} onChange={(e) => setOtherBusinessType(e.target.value)} required />
                          </label>}
                          <label className="block text-[11px] font-bold text-[#45554b] sm:col-span-2">Permanent address
                            <textarea autoComplete="street-address" className="mt-1.5 min-h-[66px] w-full resize-y rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 py-2.5 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} required />
                          </label>
                          <label className="block text-[11px] font-bold text-[#45554b] sm:col-span-2">Temporary address <span className="font-normal text-[#87938a]">(optional)</span>
                            <textarea className="mt-1.5 min-h-[66px] w-full resize-y rounded-[12px] border border-[#dfe7de] bg-[#fbfcfa] px-3 py-2.5 text-[13px] font-medium text-[#24362c] outline-none focus:border-[#68a77c]" value={temporaryAddress} onChange={(e) => setTemporaryAddress(e.target.value)} />
                          </label>
                        </div>
                        <p className="rounded-xl bg-[#f7f9f6] px-3 py-2.5 text-[10px] leading-5 text-[#77837b]">These details will be saved to your account and business settings. Your email is collected as contact information; no email or SMS code is sent.</p>
                      </>
                    )}
                    <label htmlFor="login-phone" className="block text-[11px] font-bold text-[#45554b]">Mobile number</label>
                    <div className="flex h-[54px] items-center gap-2 rounded-[13px] border border-[#dfe7de] bg-[#fbfcfa] px-2 transition focus-within:border-[#68a77c] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(91,164,111,0.12)]">
                      <div className="flex h-10 items-center gap-1.5 rounded-[9px] border border-[#e8ede7] bg-white px-2.5">
                        <Globe2 size={14} aria-hidden="true" className="text-[#6a9f74]" />
                        <input
                          aria-label="Country calling code"
                          className="w-[43px] bg-transparent text-center text-[13px] font-bold text-[#344b3d] outline-none"
                          inputMode="tel"
                          value={callingCode}
                          onChange={(e) => { setCallingCode(e.target.value.replace(/[^+\d]/g, '').slice(0, 4)); setError(''); }}
                          maxLength={4}
                        />
                      </div>
                      <span className="h-6 w-px bg-[#e7ece6]" />
                      <input
                        id="login-phone"
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="tel"
                        className="h-full min-w-0 flex-1 bg-transparent px-1 text-[14px] font-semibold tracking-[0.02em] text-[#24362c] outline-none placeholder:font-normal placeholder:text-[#a7b0a8]"
                        placeholder="98 123 4567"
                        value={phoneInput}
                        onChange={(e) => { setPhoneInput(e.target.value.replace(/[^\d\s()-]/g, '')); setError(''); }}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[10px] leading-5 text-[#8a958d]">
                      <span>Nepal’s +977 code is already filled in.</span>
                      <span className="shrink-0">Change it for another country</span>
                    </div>

                    <label htmlFor="login-password" className="block text-[11px] font-bold text-[#45554b]">Password</label>
                    <div className="flex h-[54px] items-center rounded-[13px] border border-[#dfe7de] bg-[#fbfcfa] px-3 transition focus-within:border-[#68a77c] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(91,164,111,0.12)]">
                      <LockKeyhole size={16} className="mr-2.5 shrink-0 text-[#78a381]" />
                      <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[#24362c] outline-none placeholder:text-[#a7b0a8]" placeholder="At least 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} className="p-1.5 text-[#8b998e] hover:text-[#3f7851]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>

                    {error && <p role="alert" className="rounded-xl border border-[#f3d6d1] bg-[#fff5f2] px-3 py-2.5 text-[11px] leading-5 text-[#a94f42]">{error}</p>}
                    {notice && <p role="status" className="rounded-xl border border-[#d5e9d5] bg-[#f1f8ef] px-3 py-2.5 text-[11px] leading-5 text-[#39744a]">{notice}</p>}

                    {!configured && (
                      <div className="flex gap-2.5 rounded-xl border border-[#f0dfb9] bg-[#fffaf0] p-3 text-[#765d32]">
                        <CircleHelp size={16} className="mt-0.5 shrink-0 text-[#b28b43]" />
                        <div>
                          <p className="text-[11px] font-bold">Account storage is not connected</p>
                          <p className="mt-0.5 text-[10px] leading-5">Connect Supabase to securely create accounts and sync user data. You can still explore the local preview below.</p>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={busy || !configured} className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#1b5c45] to-[#2b8058] text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(27,92,69,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_22px_rgba(27,92,69,0.24)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
                      {busy ? <><LoaderCircle size={16} className="animate-spin" /> {mode === 'signup' ? 'Creating account…' : 'Logging in…'}</> : <>{mode === 'signup' ? 'Create account' : 'Log in'} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}
                    </button>
                  </form>

                  <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#f7f9f6] p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#4b9664] shadow-sm"><Check size={14} /></span>
                    <p className="pt-0.5 text-[10px] leading-5 text-[#77837b]"><b className="font-bold text-[#45554b]">{mode === 'signup' ? 'Your data follows your account.' : 'New to Vyavasya?'}</b> {mode === 'signup' ? 'Your records will sync across devices after you log in.' : 'Choose Create account first, then log in with the same details.'}</p>
                  </div>
          <p className="mt-4 text-center text-[10px] leading-5 text-[#8a958d]">This account uses no SMS or email codes. Forgotten passwords cannot be recovered yet.</p>
            </div>
          </section>

          {previewAllowed && (
            <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#dce5da] bg-white/75 px-4 py-3 text-center sm:flex-row sm:gap-2 sm:rounded-full">
              <span className="text-[10px] text-[#7d8980]">Just exploring? This preview won’t verify a number or sync data.</span>
              <button type="button" onClick={enterPreview} className="text-[10px] font-bold text-[#28764e] hover:underline">Open local preview</button>
            </div>
          )}
          <p className="mt-4 text-center text-[9px] leading-5 text-[#98a39a]">Your phone number identifies your account. Use a unique, private password.</p>
        </div>
      </main>
    </div>
  );
}
