import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CreditCard, Eye, EyeOff, IndianRupee, LockKeyhole, Pencil, Plus, ShieldCheck, UsersRound } from 'lucide-react';
import { Badge, Callout, EmptyState, PageHead, Panel, SummaryBox } from '@/components/ui';
import { Field, Modal } from '@/components/Modal';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { writeCloudWorkspaces } from '@/lib/supabaseWorkspaces';
import { localDateKey, money } from '@/lib/format';
import type { AttendanceStatus, StaffMember, StaffRole } from '@/lib/types';

const roles: StaffRole[] = ['Administrator', 'Manager', 'Cashier', 'Inventory clerk'];
const permissions: Record<StaffRole, string[]> = {
  Administrator: ['Counter / POS', 'Customers', 'Inventory', 'Transactions', 'Reports', 'Business settings'],
  Manager: ['Counter / POS', 'Customers', 'Inventory', 'Transactions', 'Invoices', 'Purchases'],
  Cashier: ['Counter / POS', 'Customers', 'Inventory · view only'],
  'Inventory clerk': ['Inventory', 'Suppliers & purchases · view only'],
};
const statuses: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Leave'];
const phoneCountries = [
  ['🇳🇵', 'Nepal', '+977'], ['🇮🇳', 'India', '+91'], ['🇧🇩', 'Bangladesh', '+880'], ['🇵🇰', 'Pakistan', '+92'],
  ['🇱🇰', 'Sri Lanka', '+94'], ['🇦🇪', 'United Arab Emirates', '+971'], ['🇸🇦', 'Saudi Arabia', '+966'], ['🇶🇦', 'Qatar', '+974'],
  ['🇺🇸', 'United States', '+1'], ['🇨🇦', 'Canada', '+1'], ['🇬🇧', 'United Kingdom', '+44'], ['🇦🇺', 'Australia', '+61'],
  ['🇳🇿', 'New Zealand', '+64'], ['🇸🇬', 'Singapore', '+65'], ['🇲🇾', 'Malaysia', '+60'], ['🇿🇦', 'South Africa', '+27'],
  ['🇩🇪', 'Germany', '+49'], ['🇫🇷', 'France', '+33'], ['🇮🇹', 'Italy', '+39'], ['🇪🇸', 'Spain', '+34'],
  ['🇯🇵', 'Japan', '+81'], ['🇰🇷', 'South Korea', '+82'], ['🇨🇳', 'China', '+86'], ['🇭🇰', 'Hong Kong', '+852'],
] as const;
const today = () => localDateKey();
const currentMonth = () => today().slice(0, 7);
const blankStaff = (): Omit<StaffMember, 'id'> => ({ name: '', phone: '', position: '', role: 'Cashier', monthlySalary: 0, startDate: today(), status: 'Active' });
const normalizePhone = (number: string, callingCode: string) => {
  const digits = number.replace(/\D/g, '').replace(/^0+/, '');
  const codeDigits = callingCode.replace(/\D/g, '');
  const full = number.trim().startsWith('+') ? `+${number.replace(/\D/g, '')}` : `+${codeDigits}${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
};
const splitPhone = (phone: string, defaultCode: string) => {
  const country = [...phoneCountries].sort((a, b) => b[2].length - a[2].length).find(([, , code]) => phone.startsWith(code));
  const code = country?.[2] || defaultCode;
  return { code, local: phone.startsWith(code) ? phone.slice(code.length) : phone.replace(/^\+/, '') };
};

export function Staff() {
  const { data, businessId, accessRole, addStaff, updateStaff, recordAttendance, addSalaryPayment, toast } = useStore();
  const { client, user } = useAuth();
  const [tab, setTab] = useState<'team' | 'attendance' | 'payroll'>('team');
  const [staffOpen, setStaffOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<Omit<StaffMember, 'id'>>(blankStaff());
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payment, setPayment] = useState({ staffId: '', date: today(), period: currentMonth(), amount: '', accountId: '', note: '' });
  const [selectedDate, setSelectedDate] = useState(today());
  const [loginFor, setLoginFor] = useState<StaffMember | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordConfirm, setLoginPasswordConfirm] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; loginId: string; password: string } | null>(null);
  const [createLoginWithProfile, setCreateLoginWithProfile] = useState(false);
  const [phoneCallingCode, setPhoneCallingCode] = useState(data.settings.country === 'India' ? '+91' : '+977');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginIds, setLoginIds] = useState<Set<number>>(() => new Set());
  const [suspendedLoginIds, setSuspendedLoginIds] = useState<Set<number>>(() => new Set());
  const canManageLogins = Boolean(client && user) && (accessRole === 'Owner' || accessRole === 'Administrator');
  const activeStaff = data.staff.filter((person) => person.status === 'Active');
  const recordedToday = data.attendance.filter((entry) => entry.date === today());
  const presentToday = recordedToday.filter((entry) => entry.status === 'Present' || entry.status === 'Late').length;
  const payrollThisMonth = data.salaryPayments.filter((entry) => entry.period === currentMonth()).reduce((total, entry) => total + entry.amount, 0);
  const monthlySalary = activeStaff.reduce((total, person) => total + person.monthlySalary, 0);
  const monthPayments = useMemo(() => [...data.salaryPayments].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [data.salaryPayments]);

  useEffect(() => {
    if (!client || !canManageLogins) return;
    void client.rpc('get_my_staff_account_status').then(({ data: rows, error }) => {
      if (!error) {
        setLoginIds(new Set((rows || []).map((row: { staff_id: number }) => Number(row.staff_id))));
        setSuspendedLoginIds(new Set((rows || []).filter((row: { active: boolean }) => !row.active).map((row: { staff_id: number }) => Number(row.staff_id))));
      }
    });
  }, [canManageLogins, client]);

  const openNew = () => { setEditing(null); setForm(blankStaff()); setPhoneCallingCode(data.settings.country === 'India' ? '+91' : '+977'); setCreateLoginWithProfile(canManageLogins); setLoginPassword(''); setLoginPasswordConfirm(''); setShowLoginPassword(false); setShowConfirmPassword(false); setStaffOpen(true); };
  const openEdit = (person: StaffMember) => {
    setEditing(person);
    const { id: _id, ...profile } = person;
    const parsedPhone = splitPhone(profile.phone, data.settings.country === 'India' ? '+91' : '+977');
    setPhoneCallingCode(parsedPhone.code);
    setForm({ ...profile, phone: parsedPhone.local });
    setCreateLoginWithProfile(false);
    setShowLoginPassword(false);
    setShowConfirmPassword(false);
    setStaffOpen(true);
  };
  const saveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { toast('Enter the staff member’s name'); return; }
    const normalizedPhone = form.phone.trim() ? normalizePhone(form.phone, phoneCallingCode) : '';
    if (form.phone.trim() && !normalizedPhone) { toast('Enter a valid phone number for the selected country'); return; }
    const phone = normalizedPhone || '';
    if (createLoginWithProfile && !phone) { toast('Enter the staff member’s phone number to create their login'); return; }
    if (createLoginWithProfile && form.status !== 'Active') { toast('Set the staff profile to Active before creating its login'); return; }
    if (createLoginWithProfile && loginPassword.length < 10) { toast('Use a password with at least 10 characters'); return; }
    if (createLoginWithProfile && loginPassword !== loginPasswordConfirm) { toast('The passwords do not match'); return; }
    if (createLoginWithProfile) setLoginBusy(true);
    const profile = { ...form, name: form.name.trim(), phone, position: form.position.trim() };
    if (editing) {
      updateStaff(editing.id, profile);
    } else {
      const staffId = addStaff(profile);
      if (createLoginWithProfile && client && user) {
        const savedStaff = { ...profile, id: staffId };
        try {
          await writeCloudWorkspaces(client, user.id, [{ id: businessId, name: data.settings.businessName, data: { ...data, staff: [...data.staff, savedStaff] } }]);
          const { data: result, error } = await client.functions.invoke('create-staff-login', { body: {
            workspaceId: businessId, staffId, phone, name: savedStaff.name, role: savedStaff.role, password: loginPassword,
          } });
          if (error || result?.error) { setLoginBusy(false); setLoginPassword(''); setLoginPasswordConfirm(''); toast(result?.error || error?.message || 'Staff profile saved; could not create login. Use Set up login in the team list.'); setStaffOpen(false); return; }
          setLoginIds((previous) => new Set(previous).add(staffId));
          setCreatedCredentials({ name: savedStaff.name, loginId: phone, password: loginPassword });
          setLoginBusy(false);
          setLoginPassword('');
          setLoginPasswordConfirm('');
          toast('Staff profile and login created. Share the phone number and password privately.');
        } catch {
          setLoginBusy(false);
          setLoginPassword('');
          setLoginPasswordConfirm('');
          toast('Staff profile saved, but could not connect to create the login. Try Set up login in the team list.');
        }
      } else {
        toast('Staff member added');
      }
    }
    setStaffOpen(false);
    if (editing) toast('Staff profile updated');
  };
  const setAttendance = (staffId: number, status: AttendanceStatus) => {
    recordAttendance({ staffId, date: selectedDate, status });
    toast('Attendance saved');
  };
  const savePayment = (event: React.FormEvent) => {
    event.preventDefault();
    const result = addSalaryPayment({ staffId: Number(payment.staffId), date: payment.date, period: payment.period, amount: Number(payment.amount), accountId: payment.accountId ? Number(payment.accountId) : null, note: payment.note.trim() || undefined });
    if (!result.ok) { toast(result.error || 'Could not record salary'); return; }
    setPayrollOpen(false);
    setPayment({ staffId: '', date: today(), period: currentMonth(), amount: '', accountId: '', note: '' });
    toast('Salary payment recorded');
  };
  const createLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || !loginFor) return;
    setLoginBusy(true);
    const phone = normalizePhone(loginFor.phone, data.settings.country === 'India' ? '+91' : '+977');
    if (!phone) { setLoginBusy(false); toast('The saved staff phone number is invalid. Edit the profile and try again.'); return; }
    const { data: result, error } = await client.functions.invoke('create-staff-login', { body: {
      workspaceId: businessId, staffId: loginFor.id, phone, name: loginFor.name, role: loginFor.role, password: loginPassword,
    } });
    setLoginBusy(false);
    if (error || result?.error) { toast(result?.error || error?.message || 'Could not create the staff login'); return; }
    setLoginIds((previous) => new Set(previous).add(loginFor.id));
    setCreatedCredentials({ name: loginFor.name, loginId: phone, password: loginPassword });
    setLoginPassword('');
    setLoginFor(null);
    toast(loginIds.has(loginFor.id) ? 'Staff login reset. Share the new password privately.' : 'Staff login created. Share the phone number and password privately.');
  };

  return <div className="animate-fade">
    <PageHead eyebrow="Your people, attendance, and pay" title="Staff management" subhead="Add a staff profile and create its login ID and password together." action={<button className="btn-primary" onClick={openNew}><Plus size={15} /> Add staff member</button>} />
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryBox label="Active staff" value={String(activeStaff.length)} />
      <SummaryBox label="Present today" value={`${presentToday} / ${activeStaff.length}`} />
      <SummaryBox label="Expected monthly payroll" value={money(monthlySalary, data.settings.currency)} />
      <SummaryBox label="Paid this month" value={money(payrollThisMonth, data.settings.currency)} />
    </div>
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Staff records">
      {([['team', 'Team', UsersRound], ['attendance', 'Attendance', CalendarCheck], ['payroll', 'Salary & payments', CreditCard]] as const).map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${tab === id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-[#59645e] hover:border-brand-300'}`}><Icon size={14} />{label}</button>)}
    </div>

    {tab === 'team' && <>
      <Panel title="Team members" subtitle="Staff profiles and assigned access role" className="mb-4">
        {data.staff.length === 0 ? <div className="p-4"><EmptyState message="Add a staff member and set their login ID and password in the same form." />{canManageLogins && <button className="btn-primary mx-auto mt-3" onClick={openNew}><Plus size={14} /> Add staff member</button>}</div> : <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Name', 'Position', 'Access role', 'Monthly salary', 'Status', ...(canManageLogins ? ['Login'] : []), ''].map((label) => <th key={label} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wide text-[#98a199]">{label}</th>)}</tr></thead><tbody>{data.staff.map((person) => <tr key={person.id} className="border-t border-[#f0f2ee] hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[11px] font-semibold text-ink">{person.name}<div className="text-[10px] font-normal text-muted">{person.phone || 'No phone saved'}</div></td><td className="px-4 py-3 text-[11px] text-[#59645e]">{person.position || '—'}</td><td className="px-4 py-3"><Badge tone={person.role === 'Administrator' ? 'amber' : 'green'}>{person.role}</Badge></td><td className="px-4 py-3 text-[11px] font-semibold text-ink">{money(person.monthlySalary, data.settings.currency)}</td><td className="px-4 py-3"><Badge tone={person.status === 'Active' ? 'green' : 'neutral'}>{person.status}</Badge></td>{canManageLogins && <td className="px-4 py-3">{loginIds.has(person.id) ? <div className="flex flex-wrap items-center gap-2"><Badge tone={suspendedLoginIds.has(person.id) ? 'neutral' : 'green'}>{suspendedLoginIds.has(person.id) ? 'Login suspended' : 'Login ready'}</Badge><button disabled={person.status !== 'Active'} onClick={() => { setLoginFor(person); setLoginPassword(''); setShowLoginPassword(false); }} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-brand hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={12} /> Reset login</button></div> : <div><button disabled={person.status !== 'Active' || !person.phone} onClick={() => { setLoginFor(person); setLoginPassword(''); setShowLoginPassword(false); }} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-brand hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={12} /> Set up login</button>{!person.phone && <div className="mt-1 text-[9px] text-muted">Edit profile and add phone</div>}{person.phone && person.status !== 'Active' && <div className="mt-1 text-[9px] text-muted">Make profile active first</div>}</div>}</td>}<td className="px-4 py-3 text-right"><button onClick={() => openEdit(person)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-brand hover:bg-brand-100"><Pencil size={12} /> Edit</button></td></tr>)}</tbody></table></div>}
      </Panel>
      <Panel title="Role access templates" subtitle="Feature access associated with each role" className="mb-4">
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">{roles.map((role) => <div key={role} className="rounded-xl border border-line bg-white p-3"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-ink"><ShieldCheck size={14} className="text-brand" />{role}</div><div className="flex flex-wrap gap-1.5">{permissions[role].map((permission) => <span key={permission} className="rounded-full bg-[#f1f5f1] px-2 py-1 text-[9px] text-[#59645e]">{permission}</span>)}</div></div>)}</div>
      </Panel>
    </>}

    {tab === 'attendance' && <Panel title="Daily attendance" subtitle="Set a status for each active team member" action={<input aria-label="Attendance date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="field-input w-[145px]" />}>
      {activeStaff.length === 0 ? <EmptyState message="Add active staff members before recording attendance." /> : <div className="divide-y divide-[#f0f2ee]">{activeStaff.map((person) => { const record = data.attendance.find((entry) => entry.staffId === person.id && entry.date === selectedDate); return <div key={person.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"><div className="min-w-[150px] flex-1"><div className="text-[11px] font-semibold text-ink">{person.name}</div><div className="text-[10px] text-muted">{person.position || person.role}</div></div><div className="flex flex-wrap gap-1.5">{statuses.map((status) => <button key={status} onClick={() => setAttendance(person.id, status)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${record?.status === status ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-[#59645e] hover:border-brand-300'}`}>{status}</button>)}</div><div className="w-[84px] text-right">{record ? <Badge tone={record.status === 'Present' ? 'green' : record.status === 'Late' ? 'amber' : record.status === 'Absent' ? 'red' : 'neutral'}>{record.status}</Badge> : <span className="text-[10px] text-muted">Not marked</span>}</div></div>; })}</div>}
    </Panel>}

    {tab === 'payroll' && <Panel title="Salary payments" subtitle="Recorded payments also appear in your expense transactions" action={<button className="btn-primary" onClick={() => { setPayment((previous) => ({ ...previous, staffId: activeStaff[0] ? String(activeStaff[0].id) : '', amount: activeStaff[0]?.monthlySalary ? String(activeStaff[0].monthlySalary) : '' })); setPayrollOpen(true); }}><Plus size={14} /> Record salary payment</button>}>
      {monthPayments.length === 0 ? <EmptyState message="No salary payments recorded yet." /> : <div className="overflow-x-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{['Date', 'Staff member', 'Salary period', 'Payment account', 'Amount'].map((label, index) => <th key={label} className={`px-4 py-3 text-[9px] font-bold uppercase tracking-wide text-[#98a199] ${index === 4 ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead><tbody>{monthPayments.map((row) => <tr key={row.id} className="border-t border-[#f0f2ee]"><td className="px-4 py-3 text-[11px] text-[#59645e]">{row.date}</td><td className="px-4 py-3 text-[11px] font-semibold text-ink">{data.staff.find((person) => person.id === row.staffId)?.name || 'Former staff member'}</td><td className="px-4 py-3 text-[11px] text-[#59645e]">{row.period}</td><td className="px-4 py-3 text-[11px] text-[#59645e]">{data.accounts.find((account) => account.id === row.accountId)?.name || 'Not specified'}</td><td className="px-4 py-3 text-right text-[11px] font-bold text-ink">{money(row.amount, data.settings.currency)}</td></tr>)}</tbody></table></div>}
    </Panel>}

    <Callout><b className="text-brand">Staff sign-in and permissions:</b> {client ? 'On Add staff member, select Create staff login now to set their phone login ID and password in the same form. Their assigned role controls their workspace access.' : 'Staff profiles and role templates can be prepared in local preview. To create real staff logins, sign in to the owner account after the Supabase staff-access setup is installed.'}</Callout>

    <Modal open={staffOpen} onClose={() => setStaffOpen(false)} title={editing ? 'Edit staff member' : 'Add staff member'}>
      <form onSubmit={saveStaff} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Full name"><input autoFocus maxLength={100} className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label={editing && loginIds.has(editing.id) ? 'Phone · login ID' : 'Phone'}><div className="flex min-w-0 gap-2"><select aria-label="Country calling code" className="field-input w-[84px] shrink-0 px-1.5 text-center" value={phoneCallingCode} disabled={Boolean(editing && loginIds.has(editing.id))} onChange={(e) => setPhoneCallingCode(e.target.value)}>{phoneCountries.map(([flag, country, code]) => <option key={`${country}-${code}`} value={code}>{flag} {code}</option>)}</select><input aria-label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} className="field-input min-w-0 flex-1" placeholder="Mobile number" value={form.phone} disabled={Boolean(editing && loginIds.has(editing.id))} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s()-]/g, '') })} /></div>{editing && loginIds.has(editing.id) && <p className="mt-1 text-[10px] text-muted">This is the staff member’s login ID and can’t be changed here.</p>}</Field>
        <Field label="Position"><input maxLength={80} className="field-input" placeholder="e.g. Billing counter" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        <Field label="Access role"><select className="field-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></Field>
        <Field label={`Monthly salary (${data.settings.currency})`}><input type="number" min="0" step="0.01" className="field-input" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })} /></Field>
        <Field label="Start date"><input type="date" className="field-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
        <Field label="Status"><select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StaffMember['status'] })}><option>Active</option><option>Inactive</option></select></Field>
        {!editing && canManageLogins && <div className="col-span-full rounded-xl border border-[#e6eee5] bg-[#f8fbf7] p-4">
          <label className="flex cursor-pointer items-start gap-2.5 text-[12px] font-semibold text-ink"><input type="checkbox" className="mt-0.5 accent-[#246247]" checked={createLoginWithProfile} onChange={(e) => setCreateLoginWithProfile(e.target.checked)} /><span>Create staff login now<small className="mt-1 block text-[10px] font-normal leading-relaxed text-muted">Set the ID and password here. Give these sign-in details to the staff member.</small></span></label>
          {createLoginWithProfile && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Staff login ID"><input className="field-input bg-white" value={normalizePhone(form.phone, phoneCallingCode) || 'Enter a valid mobile number'} readOnly /><p className="mt-1 text-[10px] text-muted">The ID is the selected country code and phone number.</p></Field>
            <div className="hidden sm:block" />
            <Field label="Set password"><div className="relative"><input type={showLoginPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={128} className="field-input bg-white pr-10" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /><button type="button" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShowLoginPassword((visible) => !visible)}>{showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></Field>
            <Field label="Confirm password"><div className="relative"><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={128} className="field-input bg-white pr-10" value={loginPasswordConfirm} onChange={(e) => setLoginPasswordConfirm(e.target.value)} required /><button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></Field>
            <p className="col-span-full text-[10px] leading-relaxed text-muted">Use at least 10 characters. You can review the password after the login is created.</p>
          </div>}
        </div>}
        <Field label="Role includes" full><div className="flex flex-wrap gap-1.5">{permissions[form.role].map((item) => <span key={item} className="rounded-full bg-[#f1f5f1] px-2 py-1 text-[9px] text-[#59645e]">{item}</span>)}</div></Field>
        <Field label="Notes" full><textarea maxLength={500} rows={2} className="field-input resize-y" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <div className="col-span-full flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" disabled={loginBusy} onClick={() => setStaffOpen(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={loginBusy}>{loginBusy ? 'Creating staff login…' : createLoginWithProfile && !editing ? 'Save staff & create login' : 'Save staff member'}</button></div>
      </form>
    </Modal>

    <Modal open={payrollOpen} onClose={() => setPayrollOpen(false)} title="Record salary payment">
      <form onSubmit={savePayment} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Staff member"><select required className="field-input" value={payment.staffId} onChange={(e) => { const person = activeStaff.find((item) => item.id === Number(e.target.value)); setPayment({ ...payment, staffId: e.target.value, amount: person?.monthlySalary ? String(person.monthlySalary) : '' }); }}><option value="">Select staff</option>{activeStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
        <Field label={`Amount (${data.settings.currency})`}><input type="number" min="0.01" step="0.01" required className="field-input" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></Field>
        <Field label="Salary period"><input type="month" required className="field-input" value={payment.period} onChange={(e) => setPayment({ ...payment, period: e.target.value })} /></Field>
        <Field label="Payment date"><input type="date" required className="field-input" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} /></Field>
        <Field label="Paid from account" full><select className="field-input" value={payment.accountId} onChange={(e) => setPayment({ ...payment, accountId: e.target.value })}><option value="">Do not track an account</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.balance, data.settings.currency)}</option>)}</select></Field>
        <Field label="Note" full><input maxLength={180} className="field-input" value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} placeholder="Optional note" /></Field>
        <div className="col-span-full flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" onClick={() => setPayrollOpen(false)}>Cancel</button><button type="submit" className="btn-primary"><IndianRupee size={14} /> Save payment</button></div>
      </form>
    </Modal>

    <Modal open={!!loginFor} onClose={() => { if (!loginBusy) { setLoginFor(null); setLoginPassword(''); } }} title={loginFor && loginIds.has(loginFor.id) ? "Reset staff login" : "Create staff login"}>
      {loginFor && <form onSubmit={createLogin} className="space-y-4 p-5">
        <div className="rounded-xl bg-[#f1f7f1] p-3 text-[11px] leading-relaxed text-[#59645e]">{loginFor.name} will log in with <b className="text-ink">{loginFor.phone}</b> and this password. The app will limit their access to the <b className="text-ink">{loginFor.role}</b> role.</div>
        <Field label="Temporary password"><div className="relative"><input autoFocus type={showLoginPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={128} className="field-input pr-10" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /><button type="button" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShowLoginPassword((visible) => !visible)}>{showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></Field>
        <p className="text-[10px] leading-relaxed text-muted">Use at least 10 characters. Share it with the staff member privately; the app stores only its secured password hash.</p>
        <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" disabled={loginBusy} onClick={() => setLoginFor(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={loginBusy || loginPassword.length < 10}><LockKeyhole size={14} /> {loginBusy ? 'Saving…' : loginFor && loginIds.has(loginFor.id) ? 'Reset login' : 'Create login'}</button></div>
      </form>}
    </Modal>

    <Modal open={Boolean(createdCredentials)} onClose={() => setCreatedCredentials(null)} title="Staff login created">
      {createdCredentials && <div className="space-y-4 p-5">
        <div className="rounded-xl bg-[#f1f7f1] p-3 text-[11px] leading-relaxed text-[#59645e]">Give these sign-in details to <b className="text-ink">{createdCredentials.name}</b>. The password is shown here once and can’t be viewed again after you close this screen.</div>
        <Field label="Login ID"><input className="field-input" value={createdCredentials.loginId} readOnly /></Field>
        <Field label="Password"><input className="field-input select-all" value={createdCredentials.password} readOnly /></Field>
        <p className="text-[10px] leading-relaxed text-muted">The app keeps a secure password hash; it never stores a readable copy of the password.</p>
        <div className="flex justify-end border-t border-line pt-4"><button type="button" className="btn-primary" onClick={() => setCreatedCredentials(null)}>Done</button></div>
      </div>}
    </Modal>
  </div>;
}
