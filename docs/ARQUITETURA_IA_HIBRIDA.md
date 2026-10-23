# Arquitetura da IA híbrida — Desenhos Animados

## Objetivo
Construir um estúdio de animação dentro do site existente, preservando o frontend, o Supabase e as integrações atuais. Priorizar ferramentas gratuitas e nunca iniciar serviços pagos sem autorização explícita.

## Fluxo
1. **Interface web**: criar/editar personagens, roteiros, cenas e episódios.
2. **IA diretora**: transforma uma ideia em roteiro estruturado e plano de cenas; pode usar um provedor de texto configurado no servidor.
3. **Biblioteca de personagens**: metadados, imagens de referência e arquivos 3D exportados do SculptGL. O modelo deve ser salvo em Supabase Storage quando a integração de upload estiver implementada.
4. **Adaptador de geração**: interface comum para motores diferentes, sem amarrar o site a um único fornecedor.
5. **Renderizador de primeira cena**: inicialmente um protótipo determinístico em Blender/bridge local ou uma demonstração externa de geração de vídeo; o navegador não deve fingir que o vídeo foi gerado se só houver um roteiro.
6. **Áudio**: vozes, música e efeitos em etapa separada, com fornecedor e custos identificados.
7. **Persistência**: Supabase guarda projeto, personagens, cenas, estado da tarefa e URLs dos arquivos; GitHub guarda o código.

## Contrato de cena
Cada cena deve conter:
- id estável e project_id;
- duração em segundos;
- formato (16:9 ou 9:16);
- personagens referenciados;
- local, ação, movimento de câmera, iluminação e estilo;
- falas e notas de áudio;
- status (draft, ready, generating, completed, failed);
- provider e asset_url opcionais.

## Primeira cena de validação
A menina de moletom roxo encontra um coelho cinza de orelhas rosadas numa floresta ensolarada. Ela estende a mão e diz “Olá! Vamos brincar?”. O coelho pisca, mexe as orelhas e dá um pequeno salto feliz. Duração-alvo: 8 segundos, formato 16:9.

## Restrições e segurança
- Não expor chaves de API no navegador.
- Não substituir funções de produção existentes nesta etapa.
- Não assumir que uma API é gratuita: conferir cotas, preço e termos antes de conectar.
- Modelos locais de vídeo podem exigir GPU muito mais potente que a Radeon RX 550 de 4 GB; testar primeiro uma demonstração online ou uma cena simples.
- Exportações do SculptGL são malhas 3D; podem exigir retopologia, rigging e materiais antes de animação 3D articulada.
- Uma integração só é considerada funcional depois de um teste real de ponta a ponta.
