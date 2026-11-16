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
    const { phone } = await request.json();
    if (typeof phone !== 'string') return Response.json({ error: 'Enter your phone number.' }, { status: 400, headers: cors });
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from('account_login_lookup').select('email').eq('phone', phone).maybeSingle();
    // Return the same response for unknown accounts to avoid exposing registered phone numbers.
    if (profile?.email && !profile.email.endsWith('.invalid')) {
      const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
      await auth.auth.resetPasswordForEmail(profile.email, { redirectTo: `${new URL(request.url).origin}/` });
    }
    return Response.json({ message: 'If the account has a verified recovery email, a reset link has been sent.' }, { headers: cors });
  } catch {
    return Response.json({ message: 'If the account has a verified recovery email, a reset link has been sent.' }, { headers: cors });
  }
});
