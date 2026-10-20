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
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Entre na sua conta para gerar música." }), { status: 401, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!url || !anonKey) return new Response(JSON.stringify({ error: "Configuração do Supabase incompleta." }), { status: 500, headers: corsHeaders });
  if (!elevenLabsKey) return new Response(JSON.stringify({ error: "A geração de música precisa do secret ELEVENLABS_API_KEY nas Edge Functions do Supabase." }), { status: 503, headers: corsHeaders });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sua sessão expirou. Entre novamente." }), { status: 401, headers: corsHeaders });

  let body: { projectId?: string; prompt?: string; title?: string; durationSeconds?: number };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Solicitação inválida." }), { status: 400, headers: corsHeaders }); }
  const projectId = String(body.projectId ?? "");
  const prompt = String(body.prompt ?? "").trim().slice(0, 4000);
  const title = String(body.title ?? "Música gerada").trim().slice(0, 180) || "Música gerada";
  const durationSeconds = Math.min(120, Math.max(10, Math.floor(Number(body.durationSeconds) || 30)));
  if (!projectId || !prompt) return new Response(JSON.stringify({ error: "Escolha um projeto e descreva a música." }), { status: 400, headers: corsHeaders });

  const { data: project, error: projectError } = await supabase.from("creative_projects").select("id,title").eq("id", projectId).maybeSingle();
  if (projectError || !project) return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão." }), { status: 404, headers: corsHeaders });

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: "music_v2_5",
        prompt: "Original music for an animated story. Project: " + project.title + ". " + prompt,
        music_length_ms: durationSeconds * 1000,
        force_instrumental: false,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return new Response(JSON.stringify({ error: detail.slice(0, 600) || "O provedor não conseguiu gerar a música." }), { status: response.status === 429 ? 429 : 502, headers: corsHeaders });
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    const path = authData.user.id + "/" + projectId + "/" + crypto.randomUUID() + "-music.mp3";
    const { error: uploadError } = await supabase.storage.from("creative-media").upload(path, audio, { contentType: "audio/mpeg", upsert: false });
    if (uploadError) return new Response(JSON.stringify({ error: "Música gerada, mas não foi possível salvá-la: " + uploadError.message }), { status: 502, headers: corsHeaders });

    const { data: asset, error: assetError } = await supabase.from("media_assets").insert({
      user_id: authData.user.id, project_id: projectId, asset_type: "audio",
      title, storage_path: path, mime_type: "audio/mpeg",
      metadata: { generated_by: "elevenlabs-music-v2_5", prompt, duration_seconds: durationSeconds },
    }).select("id,title,project_id,storage_path,created_at").single();
    if (assetError) {
      await supabase.storage.from("creative-media").remove([path]);
      return new Response(JSON.stringify({ error: "A música foi gerada, mas não pôde ser registrada: " + assetError.message }), { status: 502, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ asset, message: "Música salva na biblioteca do projeto." }), { status: 200, headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível conectar ao gerador de música." }), { status: 502, headers: corsHeaders });
  }
});
