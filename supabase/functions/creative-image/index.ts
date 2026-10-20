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
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Entre na sua conta para gerar imagens." }), { status: 401, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anonKey) return new Response(JSON.stringify({ error: "Configuração do Supabase incompleta." }), { status: 500, headers: corsHeaders });
  if (!openaiKey) return new Response(JSON.stringify({ error: "A geração de imagens precisa do secret OPENAI_API_KEY nas Edge Functions do Supabase." }), { status: 503, headers: corsHeaders });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sua sessão expirou. Entre novamente." }), { status: 401, headers: corsHeaders });

  let body: { projectId?: string; prompt?: string; title?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Solicitação inválida." }), { status: 400, headers: corsHeaders }); }
  const projectId = String(body.projectId ?? "");
  const prompt = String(body.prompt ?? "").trim().slice(0, 8000);
  const title = String(body.title ?? "Referência visual gerada").trim().slice(0, 180) || "Referência visual gerada";
  if (!projectId || !prompt) return new Response(JSON.stringify({ error: "Escolha um projeto e descreva a imagem." }), { status: 400, headers: corsHeaders });

  const { data: project, error: projectError } = await supabase.from("creative_projects").select("id,title").eq("id", projectId).maybeSingle();
  if (projectError || !project) return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão." }), { status: 404, headers: corsHeaders });

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: "Crie uma imagem original para um projeto de animação. Não inclua letras, legendas, marcas d'água ou logotipos. Contexto do projeto: " + project.title + ". Descrição: " + prompt,
        size: "1024x1024",
        quality: "low",
        output_format: "png",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      const detail = typeof result?.error?.message === "string" ? result.error.message : "O provedor não conseguiu gerar a imagem.";
      return new Response(JSON.stringify({ error: detail }), { status: response.status === 429 ? 429 : 502, headers: corsHeaders });
    }
    const encoded = result?.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded) return new Response(JSON.stringify({ error: "O provedor não retornou a imagem." }), { status: 502, headers: corsHeaders });

    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const path = authData.user.id + "/" + projectId + "/" + crypto.randomUUID() + "-ai.png";
    const { error: uploadError } = await supabase.storage.from("creative-media").upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) return new Response(JSON.stringify({ error: "Imagem gerada, mas não foi possível salvá-la na biblioteca: " + uploadError.message }), { status: 502, headers: corsHeaders });

    const { data: asset, error: assetError } = await supabase.from("media_assets").insert({
      user_id: authData.user.id, project_id: projectId, asset_type: "image",
      title, storage_path: path, mime_type: "image/png",
      metadata: { generated_by: "gpt-image-1", prompt },
    }).select("id,title,project_id,storage_path,created_at").single();
    if (assetError) {
      await supabase.storage.from("creative-media").remove([path]);
      return new Response(JSON.stringify({ error: "A imagem foi gerada, mas não pôde ser registrada: " + assetError.message }), { status: 502, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ asset, message: "Imagem salva na biblioteca do projeto." }), { status: 200, headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível conectar ao gerador de imagens." }), { status: 502, headers: corsHeaders });
  }
});
