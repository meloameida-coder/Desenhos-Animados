import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:corsHeaders});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 const authorization=req.headers.get("Authorization");
 if(!authorization?.startsWith("Bearer "))return json({error:"Entre na sua conta para consultar o vídeo."},401);
 const url=Deno.env.get("SUPABASE_URL"), anonKey=Deno.env.get("SUPABASE_ANON_KEY"), mageKey=Deno.env.get("MAGE_API_KEY");
 if(!url||!anonKey)return json({error:"Configuração do Supabase incompleta."},500);
 if(!mageKey)return json({error:"Falta configurar MAGE_API_KEY nos Secrets das Edge Functions do Supabase."},503);
 const supabase=createClient(url,anonKey,{global:{headers:{Authorization:authorization}}});
 const {data:authData,error:authError}=await supabase.auth.getUser();
 if(authError||!authData.user)return json({error:"Sua sessão expirou. Entre novamente."},401);
 let body:{statusUrl?:string;projectId?:string;title?:string;prompt?:string;aspectRatio?:string};
 try{body=await req.json();}catch{return json({error:"Solicitação inválida."},400);}
 const statusUrl=String(body.statusUrl??""),projectId=String(body.projectId??""),title=String(body.title??"Vídeo animado gerado").trim().slice(0,180)||"Vídeo animado gerado",prompt=String(body.prompt??"").trim().slice(0,8000),aspectRatio=body.aspectRatio==="9:16"?"9:16":"16:9";
 if(!projectId||!statusUrl||!prompt)return json({error:"Faltam dados para consultar a geração."},400);
 const parsed=new URL(statusUrl);
 if(parsed.protocol!=="https:"||parsed.hostname!=="api.mage.space")return json({error:"Endereço de status inválido."},400);
 const {data:project,error:projectError}=await supabase.from("creative_projects").select("id,title").eq("id",projectId).maybeSingle();
 if(projectError||!project)return json({error:"Projeto não encontrado ou sem permissão."},404);
 try{
  const response=await fetch(parsed.toString(),{headers:{"Authorization":"Bearer "+mageKey}});
  const statusData=await response.json().catch(()=>({}));
  if(!response.ok){const detail=typeof statusData?.error?.message==="string"?statusData.error.message:"Não foi possível consultar o andamento da geração.";return json({error:detail},response.status===429?429:502);}
  const state=String(statusData?.status??"processing").toLowerCase();
  if(state!=="completed"){
   if(state==="failed"||state==="cancelled"||state==="canceled"){const detail=typeof statusData?.error?.message==="string"?statusData.error.message:"A geração de vídeo não foi concluída. Tente novamente.";return json({error:detail},502);}
   return json({status:"processing"});
  }
  if(typeof statusData?.result?.url!=="string")return json({error:"A Mage concluiu a geração, mas não retornou o arquivo do vídeo."},502);
  const videoUrl=new URL(statusData.result.url);
  if(videoUrl.protocol!=="https:")return json({error:"O serviço retornou um arquivo de vídeo inválido."},502);
  const videoResponse=await fetch(videoUrl.toString());
  if(!videoResponse.ok)return json({error:"O vídeo foi gerado, mas não foi possível baixá-lo para a biblioteca."},502);
  const contentType=videoResponse.headers.get("content-type")||"video/mp4",bytes=new Uint8Array(await videoResponse.arrayBuffer());
  if(bytes.byteLength===0)return json({error:"O serviço retornou um arquivo de vídeo vazio."},502);
  if(bytes.byteLength>50*1024*1024)return json({error:"O vídeo gerado excedeu o limite de 50 MB da biblioteca."},413);
  const extension=contentType.includes("webm")?"webm":"mp4",path=authData.user.id+"/"+projectId+"/"+crypto.randomUUID()+"-animation."+extension;
  const {error:uploadError}=await supabase.storage.from("creative-media").upload(path,bytes,{contentType,upsert:false});
  if(uploadError)return json({error:"Vídeo gerado, mas não foi possível salvá-lo: "+uploadError.message},502);
  const {data:asset,error:assetError}=await supabase.from("media_assets").insert({user_id:authData.user.id,project_id:projectId,asset_type:"video",title,storage_path:path,mime_type:contentType,metadata:{generated_by:"mage-ltx-video-096-distilled",prompt,aspect_ratio:aspectRatio,resolution:"480p",provider:"Mage API",billing:statusData?.billing??null}}).select("id,title,project_id,storage_path,created_at").single();
  if(assetError){await supabase.storage.from("creative-media").remove([path]);return json({error:"O vídeo foi gerado, mas não pôde ser registrado: "+assetError.message},502);}
  return json({status:"completed",asset,message:"Vídeo salvo na biblioteca do projeto."});
 }catch{return json({error:"Não foi possível consultar ou salvar o vídeo gerado."},502);}
});