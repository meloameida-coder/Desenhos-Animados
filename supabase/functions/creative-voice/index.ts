import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: corsHeaders });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Entre na sua conta para gerar voz." }), { status: 401, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anonKey) return new Response(JSON.stringify({ error: "Configuração do Supabase incompleta." }), { status: 500, headers: corsHeaders });
  if (!openaiKey) return new Response(JSON.stringify({ error: "A geração de voz precisa do secret OPENAI_API_KEY nas Edge Functions do Supabase." }), { status: 503, headers: corsHeaders });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sua sessão expirou. Entre novamente." }), { status: 401, headers: corsHeaders });

  let body: { projectId?: string; text?: string; title?: string; voice?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Solicitação inválida." }), { status: 400, headers: corsHeaders }); }
  const projectId = String(body.projectId ?? "");
  const text = String(body.text ?? "").trim().slice(0, 4000);
  const title = String(body.title ?? "Narração gerada").trim().slice(0, 180) || "Narração gerada";
  const allowedVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"];
  const voice = allowedVoices.includes(String(body.voice)) ? String(body.voice) : "coral";
  if (!projectId || !text) return new Response(JSON.stringify({ error: "Escolha um projeto e escreva o texto da narração." }), { status: 400, headers: corsHeaders });

  const { data: project, error: projectError } = await supabase.from("creative_projects").select("id,title").eq("id", projectId).maybeSingle();
  if (projectError || !project) return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão." }), { status: 404, headers: corsHeaders });

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        instructions: "Leia em português brasileiro, com dicção natural, clara e expressiva. Não acrescente palavras ao texto.",
        response_format: "mp3",
      }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const detail = typeof result?.error?.message === "string" ? result.error.message : "O provedor não conseguiu gerar a narração.";
      return new Response(JSON.stringify({ error: detail }), { status: response.status === 429 ? 429 : 502, headers: corsHeaders });
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    const path = authData.user.id + "/" + projectId + "/" + crypto.randomUUID() + "-voice.mp3";
    const { error: uploadError } = await supabase.storage.from("creative-media").upload(path, audio, { contentType: "audio/mpeg", upsert: false });
    if (uploadError) return new Response(JSON.stringify({ error: "Áudio gerado, mas não foi possível salvá-lo: " + uploadError.message }), { status: 502, headers: corsHeaders });

    const { data: asset, error: assetError } = await supabase.from("media_assets").insert({
      user_id: authData.user.id, project_id: projectId, asset_type: "audio",
      title, storage_path: path, mime_type: "audio/mpeg",
      metadata: { generated_by: "gpt-4o-mini-tts", voice, source_text: text },
    }).select("id,title,project_id,storage_path,created_at").single();
    if (assetError) {
      await supabase.storage.from("creative-media").remove([path]);
      return new Response(JSON.stringify({ error: "A narração foi gerada, mas não pôde ser registrada: " + assetError.message }), { status: 502, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ asset, message: "Narração salva na biblioteca do projeto." }), { status: 200, headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível conectar ao gerador de voz." }), { status: 502, headers: corsHeaders });
  }
});
