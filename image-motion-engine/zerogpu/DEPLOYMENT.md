# Implantação gratuita (sem cobrança)

1. Entre em https://huggingface.co/spaces e faça login.
2. Crie um Space novo com SDK **Gradio**.
3. Selecione o hardware **ZeroGPU** gratuito, se estiver disponível para sua conta. Não selecione GPU dedicada paga e não compre créditos.
4. Copie os arquivos deste diretório para a raiz do Space: app.py, requirements.txt e README.md.
5. Aguarde o build e teste com uma imagem pequena e um prompt curto.
6. Se o Space falhar por limite de tempo ou memória, não habilite cobrança; vamos ajustar o modelo/configuração.

## Ligação ao site
Ainda não conectar o frontend diretamente ao Space público. Primeiro precisamos confirmar que a geração funciona e decidir uma forma segura de chamada com autenticação e limites. Não coloque tokens secretos no navegador.
