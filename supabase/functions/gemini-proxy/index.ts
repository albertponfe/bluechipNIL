// Supabase Edge Function: gemini-proxy
//
// Server-side proxy for all Gemini calls. The real GEMINI_API_KEY lives only
// here (set via `supabase secrets set GEMINI_API_KEY=...`), never in the
// client bundle. The client builds the same `model` / `contents` / `config`
// shape it used to pass straight to the @google/genai SDK and posts it here
// instead; this function forwards it to Gemini and returns just the text.
//
// JWT verification is ON by default for this function (no --no-verify-jwt
// flag at deploy time), so only signed-in app users can call it — the
// supabase-js client attaches the user's access token automatically when you
// call `supabase.functions.invoke(...)`.
//
// Deploy with:
//   supabase functions deploy gemini-proxy

import { GoogleGenAI } from "npm:@google/genai@1.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const ai = new GoogleGenAI({ apiKey });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    const { model, contents, config } = await req.json();
    if (!model || !contents) {
      return new Response(JSON.stringify({ error: "model and contents are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await ai.models.generateContent({ model, contents, config });

    // Image-generation models (e.g. gemini-2.5-flash-image) return the image
    // as inline base64 data inside the response parts rather than as `.text`.
    let imageDataUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    return new Response(JSON.stringify({ text: response.text ?? "", imageDataUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gemini-proxy error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
