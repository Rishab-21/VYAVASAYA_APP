import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { PageHead, Panel, Callout } from '@/components/ui';
import { ConfirmDialog } from '@/components/Modal';
import { Field } from '@/components/Modal';
import { useAuth } from '@/lib/auth';
import { Download, Upload, RotateCcw, Save, Globe, FileText, Database, UserRound } from 'lucide-react';
import { downloadFile } from '@/lib/format';
import type { Country, Currency } from '@/lib/types';

export function Settings() {
  const { data, updateSettings, resetDemo, importBackup, exportBackup, toast } = useStore();
  const { user } = useAuth();
  const s = data.settings;
  const [businessName, setBusinessName] = useState(s.businessName);
  const [businessType, setBusinessType] = useState(s.businessType || '');
  const [owner, setOwner] = useState(s.owner);
  const [ownerEmail, setOwnerEmail] = useState(s.ownerEmail || '');
  const [dateOfBirth, setDateOfBirth] = useState(s.dateOfBirth || '');
  const [permanentAddress, setPermanentAddress] = useState(s.permanentAddress || '');
  const [temporaryAddress, setTemporaryAddress] = useState(s.temporaryAddress || '');
  const [country, setCountry] = useState<Country>(s.country);
  const [currency, setCurrency] = useState<Currency>(s.currency);
  const [calendar, setCalendar] = useState(s.calendar);
  const [invoicePrefix, setInvoicePrefix] = useState(s.invoicePrefix);
  const [fiscalYear, setFiscalYear] = useState(s.fiscalYear);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    updateSettings({
      businessName: businessName.trim() || s.businessName,
      businessType,
      owner: owner.trim() || s.owner,
      ownerEmail: ownerEmail.trim(),
      dateOfBirth,
      permanentAddress: permanentAddress.trim(),
      temporaryAddress: temporaryAddress.trim(),
      country, currency, calendar,
      invoicePrefix: invoicePrefix.trim() || 'INV',
      fiscalYear: fiscalYear.trim(),
    });
    toast('Business settings saved');
  };

  const backup = () => {
    downloadFile(exportBackup(), 'vyavasya-backup.json', 'application/json');
    toast('Backup downloaded');
  };

  const restore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importBackup(String(reader.result));
      if (ok) { toast('Backup restored'); } else { toast('That backup file could not be read'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="animate-fade">
      <PageHead
        eyebrow="Workspace setup"
        title="Business settings"
        subhead="Choose how this business workspace is organized."
        action={<button className="btn-primary" onClick={save}><Save size={15} /> Save settings</button>}
      />
      <div className="grid gap-3.5 lg:grid-cols-2">
        {/* Business profile */}
        <Panel className="p-[18px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand"><Globe size={16} /></span>
            <h3 className="font-display text-[13px] font-bold text-ink">Business profile</h3>
          </div>
          <p className="mb-3.5 text-[11px] text-muted">Set the business identity and owner details for this workspace.</p>
          <div className="space-y-3">
            <Field label="Business name"><input className="field-input mt-1.5" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></Field>
            <Field label="Business type"><input className="field-input mt-1.5" value={businessType} onChange={(e) => setBusinessType(e.target.value)} /></Field>
            <Field label="Owner name"><input className="field-input mt-1.5" value={owner} onChange={(e) => setOwner(e.target.value)} /></Field>
            <Field label="Contact email"><input type="email" className="field-input mt-1.5" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></Field>
            <Field label="Country">
              <select className="field-select mt-1.5" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                <option>Nepal</option><option>India</option>
              </select>
            </Field>
          </div>
        </Panel>

        {/* Owner details */}
        <Panel className="p-[18px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand"><UserRound size={16} /></span>
            <h3 className="font-display text-[13px] font-bold text-ink">Owner profile</h3>
          </div>
          <p className="mb-3.5 text-[11px] text-muted">Personal details supplied during account creation.</p>
          <div className="space-y-3">
            <Field label="Date of birth"><input type="date" className="field-input mt-1.5" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></Field>
            <Field label="Permanent address"><textarea className="field-input mt-1.5 min-h-20 resize-y py-2" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} /></Field>
            <Field label="Temporary address"><textarea className="field-input mt-1.5 min-h-20 resize-y py-2" value={temporaryAddress} onChange={(e) => setTemporaryAddress(e.target.value)} /></Field>
          </div>
        </Panel>

        {/* Regional preferences */}
        <Panel className="p-[18px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand"><FileText size={16} /></span>
            <h3 className="font-display text-[13px] font-bold text-ink">Regional preferences</h3>
          </div>
          <p className="mb-3.5 text-[11px] text-muted">Keep amounts and dates familiar to your team.</p>
          <div className="space-y-3">
            <Field label="Currency">
              <select className="field-select mt-1.5" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="NPR">Nepalese rupee (NPR)</option>
                <option value="INR">Indian rupee (INR)</option>
              </select>
            </Field>
            <Field label="Calendar display">
              <select className="field-select mt-1.5" value={calendar} onChange={(e) => setCalendar(e.target.value as 'AD' | 'BS')}>
                <option value="AD">AD / Gregorian</option>
                <option value="BS">Bikram Sambat (display preference)</option>
              </select>
            </Field>
            <Field label="Invoice prefix"><input className="field-input mt-1.5" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} /></Field>
            <Field label="Fiscal year"><input className="field-input mt-1.5" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} /></Field>
          </div>
        </Panel>

        {/* Data portability */}
        <Panel className="p-[18px] lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand"><Database size={16} /></span>
            <h3 className="font-display text-[13px] font-bold text-ink">Data portability</h3>
          </div>
          <p className="mb-3.5 text-[11px] text-muted">{user ? 'Your signed-in workspace syncs to Supabase and is available when you log in on another device. This device also keeps a local copy.' : 'This local preview stays on this device. Create an account and sign in to sync business records across devices.'}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={backup}><Download size={14} /> Download backup</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> Restore backup</button>
            <button className="inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-danger-light bg-danger-light px-3.5 py-2.5 text-xs font-semibold text-danger transition hover:bg-[#f9e3e0]" onClick={() => setConfirmReset(true)}><RotateCcw size={14} /> Reset demo data</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
          </div>
          <div className="mt-3"><span className="rounded-full bg-[#f1f3ef] px-2 py-1 text-[9px] text-[#8b968e]">{user ? 'Local offline copy · synced to Supabase' : 'Browser database (IndexedDB) · local to this device'}</span></div>
        </Panel>
      </div>

      <Callout><b className="text-brand">Market setup note:</b> Tax rates, fiscal calendars, and invoice compliance differ between Nepal and India. This MVP does not issue compliant tax invoices or file returns.</Callout>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => { resetDemo(); toast('Sample workspace restored'); }}
        title="Reset to demo data?"
        message="This will replace all your current data with the original Vyavasya sample data. This cannot be undone."
        confirmLabel="Reset data"
        danger
      />
    </div>
  );
}
