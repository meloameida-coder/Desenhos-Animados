# Lomi Studio — preparação para Blender

## Objetivo
Este pacote prepara o projeto para usar o Blender como ferramenta local de modelagem, rigging e renderização. O Blender roda no computador do usuário; a página hospedada não pode iniciar nem controlar o aplicativo sozinha.

## O que está preparado nesta versão
- Add-on Blender "Lomi Studio - Biblioteca 3D".
- Importação de um OBJ ou de todos os OBJ de uma pasta.
- Organização dos objetos importados em coleções separadas.
- Preparação básica de câmera, iluminação, resolução e timeline.
- Não apaga cenas nem objetos já existentes.

## Instalação do add-on
1. Baixe o repositório como ZIP ou baixe a pasta `blender-bridge/blender_addon`.
2. No Blender, abra Edit > Preferences > Add-ons (ou Get Extensions, conforme a versão).
3. Use Install from Disk e selecione um ZIP contendo a pasta `blender_addon`, ou instale o arquivo `__init__.py` empacotado como ZIP.
4. Ative "Lomi Studio - Biblioteca 3D".
5. Na janela 3D, pressione N e abra a aba Lomi.

## Importar a biblioteca
1. Extraia o ZIP dos personagens em uma pasta do computador.
2. Na aba Lomi, use "Importar todos os OBJ de uma pasta".
3. Selecione qualquer OBJ da pasta desejada. O add-on importa todos os OBJ daquela pasta.
4. Para cada personagem, confira materiais e textura. OBJ/MTL e imagens devem permanecer juntos.

## Limites conhecidos
- Importar OBJ não é reconstruir anatomia.
- Os arquivos de silhueta extrudada são props 3D planos com profundidade, não personagens articuláveis.
- O add-on ainda não cria rigging automático, não separa membros e não envia renders ao site.
- A ponte de rede local e a fila de comandos ainda não estão habilitadas. Não exponha portas locais à internet.
- Nenhuma alteração é feita no Supabase.

## Próximas etapas técnicas
1. Testar importação com a biblioteca real em Windows/macOS/Linux.
2. Criar ferramentas de reconstrução/modelagem por personagem.
3. Preparar armatures, pesos, controles faciais e ações reutilizáveis.
4. Implementar uma ponte local autenticada e uma fila de tarefas explícitas.
5. Integrar pré-visualização e transferência de render para o Studio, com consentimento do usuário.
