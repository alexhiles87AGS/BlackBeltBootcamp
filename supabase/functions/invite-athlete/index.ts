import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const admin = createClient(url, service, { auth: { autoRefreshToken:false, persistSession:false } });
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await caller.auth.getUser(token);
    if (userError || !userData.user) throw new Error('You must be signed in.');
    const { data: appProfile } = await admin.from('user_profiles').select('role').eq('auth_user_id', userData.user.id).maybeSingle();
    if (!['admin','coach'].includes(appProfile?.role || '')) return new Response(JSON.stringify({ error:'Admin or coach access required.' }), { status:403, headers:{...corsHeaders,'Content-Type':'application/json'} });

    const { name, email, role = 'athlete', gym = 'BlackBeltBootcamp', goal = 'Build consistent training habits.' } = await req.json();
    if (!name || !email) throw new Error('Name and email are required.');
    const normalisedEmail = String(email).trim().toLowerCase();

    const { data: athlete, error: athleteError } = await admin.from('athlete_profiles').upsert({ name, full_name:name, email:normalisedEmail, role, gym, goal, is_active:true, updated_at:new Date().toISOString() }, { onConflict:'email' }).select('*').single();
    if (athleteError) throw athleteError;

    const { data: list } = await admin.auth.admin.listUsers({ page:1, perPage:1000 });
    let authUser = list?.users?.find(user => user.email?.toLowerCase() === normalisedEmail);
    if (!authUser) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalisedEmail, { data:{ name, role, athlete_id:athlete.id } });
      if (inviteError) throw inviteError;
      authUser = invited.user;
    }

    if (authUser) {
      await admin.from('athlete_profiles').update({ auth_user_id:authUser.id, updated_at:new Date().toISOString() }).eq('id', athlete.id);
      await admin.from('user_profiles').upsert({ auth_user_id:authUser.id, email:normalisedEmail, full_name:name, name, role, athlete_id:athlete.id, updated_at:new Date().toISOString() }, { onConflict:'email' });
    }

    return new Response(JSON.stringify({ athlete:{...athlete,auth_user_id:authUser?.id}, invited:!!authUser }), { headers:{...corsHeaders,'Content-Type':'application/json'} });
  } catch (error) {
    return new Response(JSON.stringify({ error:error instanceof Error ? error.message : String(error) }), { status:400, headers:{...corsHeaders,'Content-Type':'application/json'} });
  }
});
