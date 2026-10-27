import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}
const API = "https://openapi.tripo3d.ai/v3";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Entre na sua conta para usar o gerador 3D." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const tripoKey = Deno.env.get("TRIPO_API_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Configuração do Supabase incompleta." }, 500);
  if (!tripoKey) return json({ error: "Falta configurar TRIPO_API_KEY nos Secrets das Edge Functions do Supabase." }, 503);

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);

  let body: { action?: string; mode?: string; prompt?: string; imageBase64?: string; imageType?: string; taskId?: string };
  try { body = await req.json(); } catch { return json({ error: "Solicitação inválida." }, 400); }

  try {
    if (body.action === "balance") {
      const response = await fetch(API + "/account/balance", { headers: { Authorization: "Bearer " + tripoKey } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.code !== 0) return json({ error: result?.message || "Não foi possível consultar os créditos do Tripo." }, response.status || 502);
      return json({ balance: result?.data?.balance ?? result?.data?.available_credits ?? null });
    }

    if (body.action === "status") {
      const taskId = String(body.taskId ?? "").trim();
      if (!/^task_[A-Za-z0-9_-]+$/.test(taskId)) return json({ error: "ID de tarefa inválido." }, 400);
      const response = await fetch(API + "/tasks/" + encodeURIComponent(taskId), { headers: { Authorization: "Bearer " + tripoKey } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.code !== 0) return json({ error: result?.message || "Não foi possível consultar a geração." }, response.status || 502);
      const data = result.data ?? {};
      return json({ taskId, status: data.status, progress: data.progress ?? 0, modelUrl: data.output?.model_url ?? null, previewUrl: data.output?.rendered_image_url ?? null, creditsConsumed: data.credits_consumed ?? null, message: data.message ?? null });
    }

    const mode = body.mode === "image" ? "image" : "text";
    let endpoint = API + "/generation/text-to-model";
    let payload: Record<string, unknown>;
    if (mode === "image") {
      const raw = String(body.imageBase64 ?? "");
      const mime = String(body.imageType ?? "");
      if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) return json({ error: "Use uma imagem PNG, JPG ou WebP." }, 400);
      const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match || match[2].length > 7_000_000) return json({ error: "A imagem é inválida ou maior que o limite de 5 MB." }, 413);
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: mime }), "character-reference." + ext);
      const upload = await fetch(API + "/files", { method: "POST", headers: { Authorization: "Bearer " + tripoKey }, body: form });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok || uploaded?.code !== 0 || !uploaded?.data?.file_token) return json({ error: uploaded?.message || "Não foi possível enviar a imagem de referência ao Tripo." }, upload.status || 502);
      endpoint = API + "/generation/image-to-model";
      payload = { input: uploaded.data.file_token, model: "v3.1-20260211", texture: true, pbr: true, texture_quality: "detailed", enable_image_autofix: true };
    } else {
      const prompt = String(body.prompt ?? "").trim().slice(0, 1000);
      if (prompt.length < 10) return json({ error: "Descreva o personagem com pelo menos 10 caracteres." }, 400);
      payload = { prompt, model: "v3.1-20260211", texture: true, pbr: true, texture_quality: "detailed" };
    }
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: "Bearer " + tripoKey, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.code !== 0 || !result?.data?.task_id) {
      const message = result?.message || result?.error || "O Tripo não conseguiu iniciar a geração.";
      const status = /credit|balance|quota/i.test(String(message)) ? 402 : response.status >= 400 ? response.status : 502;
      return json({ error: message, suggestion: result?.suggestion ?? null }, status);
    }
    return json({ taskId: result.data.task_id, status: "queued", mode });
  } catch (error) {
    console.error("tripo-character error", error);
    return json({ error: "Falha ao comunicar com a API do Tripo. Tente novamente." }, 502);
  }
});
