import { supabase } from './supabase';

export interface GenerateTextParams {
  /** Gemini model name, e.g. 'gemini-3.1-pro-preview' */
  model: string;
  /** Same `contents` shape you'd pass to the @google/genai SDK directly. */
  contents: unknown;
  /** Same `config` shape (tools, thinkingConfig, systemInstruction, etc). */
  config?: unknown;
}

/**
 * Calls the `gemini-proxy` Supabase Edge Function instead of hitting the
 * Gemini API directly from the browser. The real GEMINI_API_KEY lives only
 * on the server (a Supabase secret) — this keeps it out of the client bundle.
 *
 * Requires the user to be signed in: supabase-js attaches their session
 * token automatically, and the Edge Function rejects unauthenticated calls.
 */
export async function generateText({ model, contents, config }: GenerateTextParams): Promise<string> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { model, contents, config },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.text ?? '';
}

/**
 * Same proxy, but for Gemini's image-generation models (e.g.
 * 'gemini-2.5-flash-image'). Returns a `data:image/png;base64,...` URL.
 */
export async function generateImage({ model, contents, config }: GenerateTextParams): Promise<string> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { model, contents, config },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.imageDataUrl) throw new Error('No image returned.');
  return data.imageDataUrl;
}
