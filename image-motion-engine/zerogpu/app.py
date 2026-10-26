import os
import tempfile
from pathlib import Path

import gradio as gr
import spaces
import torch
from diffusers import WanImageToVideoPipeline
from diffusers.utils import export_to_video
from PIL import Image

MODEL_ID = os.getenv("WAN_MODEL_ID", "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers")
pipe = None

def get_pipe():
    global pipe
    if pipe is None:
        if not torch.cuda.is_available():
            raise gr.Error("A GPU ainda não foi alocada. Tente novamente em instantes.")
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        pipe = WanImageToVideoPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
        )
        pipe.enable_model_cpu_offload()
    return pipe

@spaces.GPU(duration=300)
def animate(image: Image.Image, prompt: str, progress=gr.Progress()):
    if image is None:
        raise gr.Error("Envie uma imagem para animar.")
    prompt = (prompt or "").strip()[:800]
    if not prompt:
        prompt = "A personagem faz movimentos naturais e suaves, câmera estável."
    if not torch.cuda.is_available():
        raise gr.Error("GPU indisponível no momento. Tente novamente mais tarde.")

    # O pipeline Wan I2V trabalha melhor com dimensões divisíveis por 16.
    target = (832, 480) if image.width >= image.height else (480, 832)
    image = image.convert("RGB")
    image.thumbnail(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", target, (0, 0, 0))
    canvas.paste(image, ((target[0] - image.width) // 2, (target[1] - image.height) // 2))

    try:
        progress(0.05, desc="Carregando o modelo de animação")
        pipeline = get_pipe()
        progress(0.15, desc="Preparando a imagem")
        result = pipeline(
            image=canvas,
            prompt=prompt,
            negative_prompt="blurry, distorted face, extra limbs, flicker, text, watermark",
            num_frames=33,
            guidance_scale=5.0,
            num_inference_steps=20,
        )
        frames = result.frames[0]
        fd, path = tempfile.mkstemp(suffix=".mp4", prefix="desenhos-animados-")
        os.close(fd)
        export_to_video(frames, path, fps=16)
        progress(1, desc="Vídeo pronto")
        return path
    except torch.cuda.OutOfMemoryError as exc:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise gr.Error("A GPU ficou sem memória para esta geração. Tente novamente mais tarde.") from exc
    except gr.Error:
        raise
    except Exception as exc:
        raise gr.Error(f"Não foi possível gerar o vídeo ({type(exc).__name__}). Consulte os logs do Space.") from exc

with gr.Blocks(title="Desenhos Animados — IA de Movimento") as demo:
    gr.Markdown("# Desenhos Animados — IA de Movimento")
    gr.Markdown("Protótipo gratuito de imagem para vídeo usando modelo aberto. A GPU compartilhada tem fila e limite de uso.")
    with gr.Row():
        with gr.Column():
            source = gr.Image(type="pil", label="Imagem do personagem")
            prompt = gr.Textbox(label="Como o personagem deve se mover?", placeholder="Ex.: As duas meninas dançam alegremente, movimentos suaves.", lines=3)
            run = gr.Button("Animar imagem", variant="primary")
        with gr.Column():
            output = gr.Video(label="Vídeo gerado")
    run.click(fn=animate, inputs=[source, prompt], outputs=output)
    gr.Markdown("O primeiro carregamento pode demorar. Este protótipo não garante geração dentro do limite gratuito da GPU.")

demo.queue(max_size=2).launch()
