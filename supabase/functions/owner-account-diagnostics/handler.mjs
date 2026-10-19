// Dependency injection keeps authorization and privacy tests entirely synthetic.
export function maskEmail(value) {
  if (typeof value !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(value)) return null;
  // Hide the domain too; a full domain can identify a trainer's employer.
  return value[0] + '•••@•••';
}
export function createHandler({ caller, adminUser, now = () => new Date(), revision = () => crypto.randomUUID() }) {
  return async function handle(req) {
    const origin = req.headers.get('origin');
    const allowed = origin === 'https://play.sorastarlight.net';
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      ...(allowed ? {'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'} : {}) };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowed) return reply({error:'Origin unavailable.'},403);
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (req.method !== 'POST') return reply({error:'Use POST.'},405);
    try {
      const authorization = req.headers.get('authorization') || '';
      if (!/^Bearer \S+$/i.test(authorization)) return reply({error:'Sign in first.'},401);
      const body = await req.json();
      const target = body?.targetUuid;
      if (typeof target !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(target))
        return reply({error:'Choose a trainer.'},400);
      const client = caller(authorization);
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data?.user) return reply({error:'Sign in first.'},401);
      const context = await client.rpc('owner_account_diagnostics_context',{p_user:target});
      if (context.error || context.data?.targetUuid !== target)
        return reply({error:'Owner access required or account unavailable.'},403);
      const result = await adminUser(target);
      if (result.error || result.data?.user?.id !== target) return reply({error:'Diagnostics unavailable.'},503);
      const user = result.data.user;
      const providers = Array.isArray(user.identities) ? [...new Set(user.identities
        .map(i => i.provider).filter(p => typeof p === 'string' && /^[a-z0-9_-]{1,40}$/.test(p)))] : null;
      return reply({targetUuid:target,snapshotRevision:revision(),observedAt:now().toISOString(),
        capabilities:{inspect:true},maskedEmail:maskEmail(user.email),
        emailVerified:user.email ? Boolean(user.email_confirmed_at) : null,
        passwordPresent:typeof context.data.passwordPresent === 'boolean' ? context.data.passwordPresent : null,
        authProviders:providers,appConnections:context.data.appConnections,
        remainingRoutes:'Unknown: sign-in methods have not been tested.'});
    } catch { return reply({error:'Diagnostics unavailable.'},503); }
  };
}
