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
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Entre na sua conta para gerar vídeos." }), { status: 401, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anonKey) return new Response(JSON.stringify({ error: "Configuração do Supabase incompleta." }), { status: 500, headers: corsHeaders });
  if (!geminiKey) return new Response(JSON.stringify({ error: "A geração de vídeo precisa do secret GEMINI_API_KEY nas Edge Functions do Supabase." }), { status: 503, headers: corsHeaders });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sua sessão expirou. Entre novamente." }), { status: 401, headers: corsHeaders });

  let body: { projectId?: string; prompt?: string; title?: string; aspectRatio?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Solicitação inválida." }), { status: 400, headers: corsHeaders }); }
  const projectId = String(body.projectId ?? "");
  const prompt = String(body.prompt ?? "").trim().slice(0, 8000);
  const title = String(body.title ?? "Vídeo animado gerado").trim().slice(0, 180) || "Vídeo animado gerado";
  const aspectRatio = body.aspectRatio === "9:16" ? "9:16" : "16:9";
  if (!projectId || !prompt) return new Response(JSON.stringify({ error: "Escolha um projeto e descreva o vídeo." }), { status: 400, headers: corsHeaders });

  const { data: project, error: projectError } = await supabase.from("creative_projects").select("id,title").eq("id", projectId).maybeSingle();
  if (projectError || !project) return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão." }), { status: 404, headers: corsHeaders });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?key=" + encodeURIComponent(geminiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-omni-1.1-flash",
        input: "Create an original animated video for the project " + project.title + ". Do not include subtitles or visible text unless the prompt specifically requires it. Scene description: " + prompt,
        response_format: { type: "video", aspect_ratio: aspectRatio, resolution: "720p" },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      const detail = typeof result?.error?.message === "string" ? result.error.message : "O provedor não conseguiu gerar o vídeo.";
      return new Response(JSON.stringify({ error: detail }), { status: response.status === 429 ? 429 : 502, headers: corsHeaders });
    }
    let encoded = result?.output_video?.data;
    let mimeType = result?.output_video?.mime_type || "video/mp4";
    if (typeof encoded !== "string") {
      const steps = Array.isArray(result?.steps) ? result.steps : [];
      for (const step of steps) {
        for (const part of (Array.isArray(step?.content) ? step.content : [])) {
          if (part?.type === "video" && typeof part?.data === "string") {
            encoded = part.data;
            mimeType = typeof part.mime_type === "string" ? part.mime_type : "video/mp4";
            break;
          }
        }
        if (typeof encoded === "string") break;
      }
    }
    if (typeof encoded !== "string" || !encoded) return new Response(JSON.stringify({ error: "O provedor não retornou o arquivo de vídeo. Tente novamente ou use um prompt mais curto." }), { status: 502, headers: corsHeaders });

    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.byteLength > 50 * 1024 * 1024) return new Response(JSON.stringify({ error: "O vídeo gerado excedeu o limite de 50 MB da biblioteca." }), { status: 413, headers: corsHeaders });
    const extension = mimeType.includes("webm") ? "webm" : "mp4";
    const path = authData.user.id + "/" + projectId + "/" + crypto.randomUUID() + "-animation." + extension;
    const { error: uploadError } = await supabase.storage.from("creative-media").upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) return new Response(JSON.stringify({ error: "Vídeo gerado, mas não foi possível salvá-lo: " + uploadError.message }), { status: 502, headers: corsHeaders });

    const { data: asset, error: assetError } = await supabase.from("media_assets").insert({
      user_id: authData.user.id, project_id: projectId, asset_type: "video",
      title, storage_path: path, mime_type: mimeType,
      metadata: { generated_by: "gemini-omni-1.1-flash", prompt, aspect_ratio: aspectRatio },
    }).select("id,title,project_id,storage_path,created_at").single();
    if (assetError) {
      await supabase.storage.from("creative-media").remove([path]);
      return new Response(JSON.stringify({ error: "O vídeo foi gerado, mas não pôde ser registrado: " + assetError.message }), { status: 502, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ asset, message: "Vídeo salvo na biblioteca do projeto." }), { status: 200, headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível conectar ao gerador de vídeos." }), { status: 502, headers: corsHeaders });
  }
});
