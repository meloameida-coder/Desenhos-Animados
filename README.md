# Desenhos Animados

Aplicação web em português para organizar projetos criativos de desenhos, personagens, episódios, cenas e músicas. A base usa React + TypeScript + Vite e autenticação/dados no Supabase.

## Rodar localmente

1. Instale Node.js (versão LTS) e npm.
2. Copie `.env.example` para `.env.local`.
3. Preencha as variáveis com a URL do projeto Supabase e a chave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`). Nunca use a chave `service_role` no navegador.
4. Instale dependências e rode:

```bash
npm install
npm run dev
```

## Publicação

O projeto pode ser implantado em um host estático compatível com Vite, como Cloudflare Pages. Configure as mesmas variáveis de ambiente no painel do host e use `npm run build` como comando de build e `dist` como diretório de saída.

## Situação atual

- Login, cadastro e recuperação de senha pelo Supabase.
- Projetos com criação, edição, status e exclusão de conteúdo vinculado.
- Personagens, episódios/roteiros, cenas e músicas com criação, listagem, edição e exclusão, respeitando as políticas RLS.
- Biblioteca de mídia com upload privado de imagens, áudios, vídeos e PDFs para Supabase Storage; acesso a arquivos com links temporários.
- Recuperação de senha com fluxo de atualização de senha incluído.
- Assistente de texto conectado à Edge Function `creative-assistant` para ajudar a criar descrições de personagens, sinopses, roteiros, cenas, prompts visuais e letras. Para ativar, cadastre `OPENAI_API_KEY` nos Secrets das Edge Functions do Supabase; a chave não deve ir para o frontend.
- Geração real de imagens, voz, música e vídeo ainda depende de integrar e configurar provedores específicos e credenciais seguras.
- O build automatizado está configurado no GitHub Actions; a compilação e a publicação ainda precisam ser verificadas no ambiente de execução.
