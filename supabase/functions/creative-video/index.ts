import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
function json(data: unknown, status=200){return new Response(JSON.stringify(data),{status,headers:corsHeaders});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 const authorization=req.headers.get("Authorization");
 if(!authorization?.startsWith("Bearer "))return json({error:"Entre na sua conta para gerar vídeos."},401);
 const url=Deno.env.get("SUPABASE_URL"), anonKey=Deno.env.get("SUPABASE_ANON_KEY"), mageKey=Deno.env.get("MAGE_API_KEY");
 if(!url||!anonKey)return json({error:"Configuração do Supabase incompleta."},500);
 if(!mageKey)return json({error:"Falta configurar MAGE_API_KEY nos Secrets das Edge Functions do Supabase."},503);
 const supabase=createClient(url,anonKey,{global:{headers:{Authorization:authorization}}});
 const {data:authData,error:authError}=await supabase.auth.getUser();
 if(authError||!authData.user)return json({error:"Sua sessão expirou. Entre novamente."},401);
 let body:{projectId?:string;prompt?:string;title?:string;aspectRatio?:string};
 try{body=await req.json();}catch{return json({error:"Solicitação inválida."},400);}
 const projectId=String(body.projectId??""), prompt=String(body.prompt??"").trim().slice(0,8000), title=String(body.title??"Vídeo animado gerado").trim().slice(0,180)||"Vídeo animado gerado", aspectRatio=body.aspectRatio==="9:16"?"9:16":"16:9";
 if(!projectId||!prompt)return json({error:"Escolha um projeto e descreva o vídeo."},400);
 const {data:project,error:projectError}=await supabase.from("creative_projects").select("id,title").eq("id",projectId).maybeSingle();
 if(projectError||!project)return json({error:"Projeto não encontrado ou sem permissão."},404);
 try{
  const response=await fetch("https://api.mage.space/v1/ltx_video/generate",{method:"POST",headers:{"Authorization":"Bearer "+mageKey,"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({prompt:"Create an original animated video for the project "+project.title+". Do not include subtitles or visible text unless the prompt specifically requires it. Scene description: "+prompt,aspect_ratio:aspectRatio,resolution:"480p",model_id:"ltx-video-096-distilled"})});
  const submitted=await response.json().catch(()=>({}));
  if(!response.ok){const detail=typeof submitted?.error?.message==="string"?submitted.error.message:typeof submitted?.message==="string"?submitted.message:"O serviço de vídeo recusou a solicitação.";return json({error:detail},response.status===429?429:response.status===402?402:502);}
  const statusUrl=typeof submitted?.status_url==="string"?submitted.status_url:"";
  if(!statusUrl)return json({error:"O serviço de vídeo não retornou o endereço de acompanhamento da geração."},502);
  const parsed=new URL(statusUrl);
  if(parsed.protocol!=="https:"||parsed.hostname!=="api.mage.space")return json({error:"O serviço retornou um endereço de status inválido."},502);
  return json({status:"processing",statusUrl,projectId,title,prompt,aspectRatio});
 }catch{return json({error:"Não foi possível iniciar a geração na Mage API. Verifique MAGE_API_KEY e tente novamente."},502);}
});