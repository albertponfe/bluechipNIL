// Supabase Edge Function: keep-alive
//
// Pings the Supabase API every 6 hours (driven by a GitHub Actions cron)
// so the Free tier project doesn't auto-pause after 7 days of inactivity.
//
// Deploy once with:
//   supabase functions deploy keep-alive --no-verify-jwt
//
// Manual test:
//   curl https://<project-ref>.supabase.co/functions/v1/keep-alive

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // A trivial query against auth.users — guaranteed to exist on every
    // Supabase project, no app tables required. Counts as DB activity.
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, ts: new Date().toISOString() }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
