import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const phoneEmail = (phone: string) => `phone${phone.replace(/\D/g, '')}@accounts.vyavasya.invalid`;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
  try {
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Sign in as the business owner first.' }, { status: 401, headers: cors });
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return Response.json({ error: 'Your sign-in has expired. Please log in again.' }, { status: 401, headers: cors });

    const input = await request.json();
    const staffId = Number(input.staffId);
    const workspaceId = String(input.workspaceId || '');
    const phone = String(input.phone || '').trim();
    const name = String(input.name || '').trim().slice(0, 100);
    const role = String(input.role || '');
    const password = String(input.password || '');
    if (!Number.isSafeInteger(staffId) || staffId <= 0 || !workspaceId || !/^\+[1-9]\d{7,14}$/.test(phone) || !name || password.length < 10 || password.length > 128) {
      return Response.json({ error: 'Check the staff phone number and use a temporary password with at least 10 characters.' }, { status: 400, headers: cors });
    }
    if (!['Administrator', 'Manager', 'Cashier', 'Inventory clerk'].includes(role)) return Response.json({ error: 'Select a valid staff role.' }, { status: 400, headers: cors });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: membership } = await admin.from('staff_accounts').select('owner_id, workspace_id, role, active').eq('user_id', user.id).maybeSingle();
    const ownerId = membership?.active && membership.role === 'Administrator' && membership.workspace_id === workspaceId ? membership.owner_id : user.id;
    const { data: owner } = await admin.from('business_workspaces').select('owner_id').eq('owner_id', ownerId).eq('workspace_id', workspaceId).maybeSingle();
    if (!owner || (membership && ownerId !== membership.owner_id)) return Response.json({ error: 'Only the business owner or an active administrator can create staff logins.' }, { status: 403, headers: cors });
    const { data: existingStaff } = await admin.from('business_workspaces').select('data').eq('owner_id', ownerId).eq('workspace_id', workspaceId).single();
    const staff = (existingStaff?.data?.staff || []).find((entry: { id: number; phone?: string; role?: string }) => entry.id === staffId);
    if (!staff || typeof staff.phone !== 'string' || staff.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '') || staff.role !== role || staff.status !== 'Active') {
      return Response.json({ error: 'Save the staff profile and role first, then create its login.' }, { status: 409, headers: cors });
    }

    const email = phoneEmail(phone);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { login_method: 'staff_phone_password', phone_number: phone, full_name: name },
    });
    if (createError || !created.user) return Response.json({ error: createError?.message.includes('already been registered') ? 'This phone number already has an app login.' : 'Could not create the staff login. Check that the phone number is not already in use.' }, { status: 409, headers: cors });

    const { error: metadataError } = await admin.auth.admin.updateUserById(created.user.id, { app_metadata: { account_type: 'staff' } });
    if (metadataError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: 'Could not secure the staff account type.' }, { status: 500, headers: cors });
    }

    const { error: linkError } = await admin.from('staff_accounts').insert({
      user_id: created.user.id, owner_id: ownerId, workspace_id: workspaceId, staff_id: staffId, phone, role, active: true,
    });
    if (linkError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: 'Could not link the new login to this staff profile.' }, { status: 409, headers: cors });
    }
    return Response.json({ ok: true, message: 'Staff login created. Give the staff member their phone number and temporary password.' }, { headers: cors });
  } catch {
    return Response.json({ error: 'Could not create the staff login. Please try again.' }, { status: 400, headers: cors });
  }
});
