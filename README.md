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
- Projetos, personagens, episódios/roteiros, cenas e músicas com operações iniciais de criação, listagem e exclusão, respeitando as políticas RLS.
- Biblioteca de mídia com estrutura visual pronta; upload real de arquivos depende da configuração do Supabase Storage.
- Geração de imagem, voz, música e vídeo por IA ainda depende da escolha e configuração de provedores; a interface não simula que essas integrações estejam funcionando.
- O build automatizado está configurado no GitHub Actions, mas deve ser confirmado após a primeira execução.
