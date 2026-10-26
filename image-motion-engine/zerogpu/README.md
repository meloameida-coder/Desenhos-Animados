---
title: Desenhos Animados - IA de Movimento
emoji: 🎬
colorFrom: purple
colorTo: pink
sdk: gradio
sdk_version: 5.20.1
app_file: app.py
pinned: false
---

# Protótipo de IA de imagem para vídeo

Este Space usa o modelo aberto Wan 2.1 I2V para tentar transformar uma imagem em um vídeo curto. Ele não chama uma API comercial de geração.

## Limites importantes
- Configure o Space com hardware ZeroGPU. A documentação atual informa 48 GB de VRAM para o perfil grande e uma cota gratuita diária limitada; o uso real depende da fila, inicialização e duração da geração.
- O modelo 14B é pesado e pode não terminar dentro da cota gratuita. Este código é experimental e precisa ser validado no Space antes de ligar ao site.
- Não mude para hardware pago nem adicione créditos.
- A primeira execução baixa vários GB de pesos e pode demorar.
- Confira a licença e os termos do modelo antes de uso comercial.

## Arquivos
Use este diretório como conteúdo raiz de um novo Hugging Face Space Gradio. Copie app.py, requirements.txt e este README para a raiz do Space.
