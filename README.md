# Desenhos Animados

Aplicação web em português para organizar projetos criativos de desenhos, personagens, episódios, cenas e músicas. A base usa React + TypeScript + Vite e autenticação/dados no Supabase.

## Rodar localmente

1. Instale Node.js (versão LTS) e npm.
2. Opcionalmente, copie `.env.example` para `.env.local` para sobrescrever a URL e a chave publishable padrão do projeto.
3. Nunca use a chave `service_role` no navegador.
4. Instale dependências e rode:

```bash
npm install
npm run dev
```

## Publicação

O projeto pode ser implantado em um host estático compatível com Vite, como Cloudflare Pages. Configure as mesmas variáveis de ambiente no painel do host e use `npm run build` como comando de build e `dist` como diretório de saída.

## Publicar no Cloudflare Pages

O workflow manual `Deploy to Cloudflare Pages` está em GitHub Actions. Para usá-lo uma vez:
1. Crie um projeto Cloudflare Pages com o nome `desenhos-animados` (ou ajuste o nome no workflow).
2. No Cloudflare, crie um API Token personalizado com permissão Account → Cloudflare Pages → Edit e copie o Account ID do painel.
3. No GitHub, abra Settings → Secrets and variables → Actions e adicione `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. A URL e a chave publishable pública do Supabase já estão configuradas como valores padrão no app.
4. Em Actions, execute manualmente `Deploy to Cloudflare Pages`.
5. No Supabase Auth, adicione a URL final do site à lista de Redirect URLs para cadastro, confirmação de e-mail e recuperação de senha.

A chave publishable do Supabase pode ser usada no frontend. Nunca use `service_role` nem coloque as chaves dos provedores de IA no GitHub.

## Situação atual (auditoria de 26/10/2026)

- O app React + TypeScript + Vite usa Supabase para autenticação e dados persistentes.
- O banco tem as tabelas `creative_projects`, `characters`, `episodes`, `scenes`, `songs`, `media_assets` e `generation_jobs`, com RLS habilitado. Na auditoria, havia 1 projeto, 3 personagens, 1 episódio, 1 cena, 1 música, 1 mídia e 17 tarefas de geração (5 concluídas e 12 com falha).
- A página Hugging Face `taisse/desenhos-animados-ia` é uma interface estática separada, que salva projetos no navegador. Ela não está conectada ao banco Supabase nem ao motor de animação deste repositório.
- As funções `creative-image`, `creative-voice`, `creative-music`, `creative-video` e `creative-video-status` foram bloqueadas para impedir chamadas a provedores que podem cobrar. A função `creative-assistant` continua chamando Gemini API; confirme cotas e faturamento do projeto Google antes de assumir custo zero.
- Foi adicionado `public/animation-studio.js` e integrado ao app React existente por `src/components/AnimationStudio.tsx`; a navegação inclui “Motor de animação”. Ele desenha um personagem vetorial original com movimentos básicos (dança, andar, pular e acenar) e grava um clipe WebM usando Canvas/MediaRecorder no navegador, sem API de geração paga.
- Este motor 2D é uma base funcional para movimentos controlados e montagem simples de clipes; não é ainda um modelo generativo de vídeo, não anima uma imagem arbitrária enviada pelo usuário e não produz vozes ou música.
- O motor está integrado ao app React deste repositório, mas o site estático `https://taisse-desenhos-animados-ia.static.hf.space/` é um repositório separado e não recebe estes commits automaticamente. A integração no Hugging Face exige publicar o mesmo arquivo e adicionar o carregador na página desse Space; não foi possível enviar commits diretamente ao Space nesta sessão porque não há conexão de escrita do Hugging Face disponível.
- Para geração de vídeo por modelo de IA, modelos como AnimateDiff estão documentados no Diffusers, mas precisam de computação adequada. Um Space estático não executa o modelo; a opção ZeroGPU pode oferecer quota gratuita limitada, enquanto hardware GPU dedicado tem cobrança. Consulte a documentação do Hugging Face antes de habilitar hardware ou assumir que a execução será gratuita.
- Nunca coloque `service_role`, `GEMINI_API_KEY` ou tokens privados no frontend ou no repositório.
