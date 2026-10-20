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
2. Em Settings → Secrets and variables → Actions, adicione `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. A URL e a chave publishable pública do Supabase já estão configuradas como valores padrão no app.
3. O token Cloudflare precisa ter permissão para publicar Pages no account correto.
4. Em Actions, execute manualmente `Deploy to Cloudflare Pages`.
5. No Supabase Auth, adicione a URL final do site à lista de Redirect URLs para cadastro, confirmação de e-mail e recuperação de senha.

A chave publishable do Supabase pode ser usada no frontend. Nunca use `service_role` nem coloque as chaves dos provedores de IA no GitHub.

## Situação atual

- Login, cadastro e recuperação de senha pelo Supabase.
- Projetos com criação, edição, status e exclusão de conteúdo vinculado.
- Personagens, episódios/roteiros, cenas e músicas com criação, listagem, edição e exclusão, respeitando as políticas RLS.
- Biblioteca de mídia com upload privado de imagens, áudios, vídeos e PDFs para Supabase Storage; acesso a arquivos com links temporários.
- Recuperação de senha com fluxo de atualização de senha incluído.
- Assistente de texto conectado à Edge Function `creative-assistant` para ajudar a criar descrições de personagens, sinopses, roteiros, cenas, prompts visuais e letras.
- Geração de texto, imagem e voz/narração via OpenAI (`OPENAI_API_KEY`), música via ElevenLabs (`ELEVENLABS_API_KEY`) e vídeo animado via Gemini Omni Flash (`GEMINI_API_KEY`). Os arquivos gerados são salvos no bucket privado e registrados na biblioteca.
- Cadastre `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` e `GEMINI_API_KEY` nos Secrets das Edge Functions do Supabase. Nunca coloque essas chaves no frontend ou no repositório. Os provedores podem cobrar por geração e cada botão de geração dispara uma solicitação paga conforme o plano da conta.
- O build automatizado está configurado no GitHub Actions; a compilação e a publicação ainda precisam ser verificadas no ambiente de execução.
