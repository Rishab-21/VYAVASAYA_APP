import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

  try {
    const { phone, password } = await request.json();
    if (typeof phone !== 'string' || typeof password !== 'string' || password.length < 8 || password.length > 256) {
      return Response.json({ error: 'Enter a valid phone number and password.' }, { status: 400, headers: cors });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from('account_login_lookup').select('email').eq('phone', phone).maybeSingle();
    if (!profile?.email || profile.email.endsWith('.invalid')) {
      return Response.json({ error: 'Account not found or recovery email not verified. Contact support to update your email.' }, { status: 401, headers: cors });
    }

    const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session) return Response.json({ error: 'Incorrect phone number or password, or email not verified.' }, { status: 401, headers: cors });
    return Response.json(data.session, { headers: cors });
  } catch {
    return Response.json({ error: 'Could not sign in. Please try again.' }, { status: 400, headers: cors });
  }
});
