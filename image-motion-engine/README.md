# Motor próprio de animação de imagens

API FastAPI para transformar uma imagem enviada pelo usuário em um vídeo curto usando o modelo aberto **Wan 2.1 I2V 14B 480P** via Diffusers. Não chama APIs comerciais de geração.

## Requisitos reais
- Python 3.10+
- GPU NVIDIA com CUDA. O modelo 14B é pesado; use uma GPU com bastante VRAM (idealmente 24 GB ou mais, dependendo da configuração). CPU ou hospedagem gratuita comum não é adequada para gerar vídeo com velocidade prática.
- O primeiro download dos pesos pode ocupar dezenas de GB.

## Executar
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_ENGINE_TOKEN='gere-um-segredo-longo'
uvicorn app:app --host 0.0.0.0 --port 7860
```

No Windows, ative o ambiente com `.venv\\Scripts\\activate`.

## Testar
```bash
curl http://localhost:7860/health
curl -X POST http://localhost:7860/animate \
  -H "Authorization: Bearer $AI_ENGINE_TOKEN" \
  -F "image=@personagem.png" \
  -F "prompt=A personagem dança alegremente, movimento suave, câmera fixa" \
  --output personagem.mp4
```

## Implantação
Este diretório é o motor de inferência, não um servidor GPU gratuito já hospedado. Publique-o em uma máquina GPU que você controle e configure a URL e o token no backend Supabase. Não exponha o token no navegador. Não configure uma plataforma que exija pagamento sem aprovação explícita.

## Licença
Confira os termos e a licença do modelo Wan 2.1 e das dependências antes de uso comercial. Este projeto não inclui os pesos do modelo.