---
title: Lomi - Laboratório de Movimento IA
emoji: 🎬
colorFrom: purple
colorTo: pink
sdk: gradio
sdk_version: 5.20.1
app_file: app.py
pinned: false
---

# Lomi — laboratório de movimento IA

Protótipo separado para validar geração de um clipe curto a partir de uma imagem de personagem. Não substitui o site React existente nem modifica Supabase.

## Publicar como Hugging Face Space

Crie um **novo Space** na conta Hugging Face:
- SDK: **Gradio**
- Hardware: **ZeroGPU**, se estiver disponível na conta
- Visibilidade: escolha conforme desejar; personagens enviados podem ser conteúdo privado
- Copie para a raiz desse Space os três arquivos desta pasta: `app.py`, `requirements.txt` e este `README.md`

O Space deve ter `app.py` na raiz. Não cole tokens do Supabase, senhas ou chaves privadas neste projeto.

## Primeiro teste de aceitação

1. Envie uma imagem de um personagem.
2. Clique em **Gerar clipe de teste**.
3. Confirme se a saída é um MP4 reproduzível.
4. Compare rosto, cores, roupa e proporções com a imagem original.
5. Registre se a geração concluiu, quanto demorou e se houve erro de GPU.

## Limites conhecidos

- Usa Stable Video Diffusion XT image-to-video como teste inicial; ele não é condicionado por texto, portanto o campo de ação serve apenas como anotação. Não espere que o personagem execute exatamente a ação escrita.
- O resultado é um clipe curto experimental, não um episódio completo.
- A GPU gratuita é compartilhada, tem quota limitada e pode ficar indisponível. Não habilite hardware pago sem aprovação explícita.
- A primeira execução pode demorar por causa do download dos pesos. O código pode precisar de ajustes conforme o runtime e as bibliotecas disponíveis no Space.
- A geração pode alterar detalhes do personagem; não garante consistência entre cenas.
- Não está conectado ao site, à conta Supabase ou a qualquer fluxo de publicação automática.

## Próxima etapa depois do teste

Se a geração funcionar, comparar a saída com o motor 3D controlável existente. Usar o 3D para ações repetíveis e identidade consistente; reservar a geração de vídeo para cenas especiais. Só depois de validar o MP4, planejar a integração do Space ao app existente.
