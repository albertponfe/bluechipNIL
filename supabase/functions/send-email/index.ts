// Supabase Edge Function: send-email
//
// Server-side email sender via Resend. The real RESEND_API_KEY lives only
// here (set via `supabase secrets set RESEND_API_KEY=...`), never in the
// client bundle.
//
// The client posts a JSON body with { to, subject, html } and this function
// forwards it to Resend and returns the result.
//
// JWT verification is ON by default, so only signed-in app users can call it —
// the supabase-js client attaches the user's access token automatically when
// you call `supabase.functions.invoke(...)`.
//
// Deploy with:
//   supabase functions deploy send-email

import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured on the server.");
    }

    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, and html are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
