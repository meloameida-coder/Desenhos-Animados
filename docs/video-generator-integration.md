# Integração do gerador de vídeos — plano de implementação

## Objetivo
Trocar o fluxo manual do HybridStudio por uma solicitação de geração de vídeo rastreável, sem acoplar a interface a um fornecedor específico.

## Estado confirmado
- O componente `src/components/HybridStudio.tsx` atualmente permite editar/copiar prompts, salvar imagens e carregar MP4/WEBM manualmente.
- O Supabase já possui `public.scenes`, `public.media_assets` e `public.generation_jobs`.
- `generation_jobs` suporta `job_type = 'video'` e estados `queued`, `processing`, `completed`, `failed`, `cancelled`.

## Decisão de arquitetura
1. A interface envia a cena selecionada para uma Supabase Edge Function autenticada.
2. A função valida propriedade do projeto/cena e cria um registro de job.
3. Um adaptador de provedor executa a geração fora do navegador. Não expor tokens do provedor ao frontend.
4. A conclusão salva o vídeo no bucket privado `creative-media`, cria um registro em `media_assets` e atualiza cena/job.
5. A interface consulta o estado do job e apresenta progresso, erro ou vídeo pronto.

## Escolha do provedor
Começar com um provedor/worker compatível com modelos abertos (Wan ou LTX) executados em GPU sob demanda. Não assumir que modelo aberto significa execução gratuita: GPU em nuvem tem custo por tempo. Antes de ativar qualquer chamada paga, mostrar estimativa/custo e exigir confirmação explícita do usuário.

## Segurança
- Manter `verify_jwt = true` e validar o usuário da sessão.
- Não colocar chaves de API no bundle do frontend.
- Não usar `service_role` no cliente.
- Validar que cena, projeto e job pertencem ao usuário autenticado.
- Não aceitar URLs arbitrárias para download sem validação; limitar tamanho, MIME e tempo de execução.
- Não iniciar geração paga durante testes automáticos.

## Critérios para considerar a integração pronta
- Um clique cria um job real e mostra seu estado.
- A chamada chega a um provedor configurado e retorna um ID de tarefa.
- Erros e limites são exibidos sem perder a cena.
- O MP4 final é salvo na biblioteca e ligado à cena.
- Teste end-to-end em ambiente de desenvolvimento, sem deploy de produção até autorização.

## Não implementado ainda
Nenhuma geração real foi executada. O provedor, URL de execução e modelo precisam ser escolhidos/configurados antes de implementar o adaptador final.
