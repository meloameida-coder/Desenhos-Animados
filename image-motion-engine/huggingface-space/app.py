import os
import tempfile
import threading
from pathlib import Path

import gradio as gr
import spaces
import torch
from diffusers import StableVideoDiffusionPipeline
from diffusers.utils import export_to_video
from PIL import Image, ImageOps

MODEL_ID = os.getenv(
    "VIDEO_MODEL_ID",
    "stabilityai/stable-video-diffusion-img2vid-xt-1-1",
)
MAX_IMAGE_PIXELS = 20_000_000
_pipeline = None
_pipeline_lock = threading.Lock()


def prepare_image(image: Image.Image) -> Image.Image:
    """Normalize an uploaded character image to the model's landscape frame."""
    if image is None:
        raise gr.Error("Envie uma imagem do personagem para começar.")
    image = ImageOps.exif_transpose(image).convert("RGB")
    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise gr.Error("A imagem é muito grande. Envie uma imagem com até 20 megapixels.")
    # SVD expects a 1024x576 image. Fit rather than stretch the character.
    image = ImageOps.fit(
        image,
        (1024, 576),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    return image


def get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    with _pipeline_lock:
        if _pipeline is None:
            if not torch.cuda.is_available():
                raise gr.Error(
                    "A GPU não está disponível. Este Space precisa executar com ZeroGPU."
                )
            pipe = StableVideoDiffusionPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.float16,
                variant="fp16",
            )
            # CPU offload reduces VRAM pressure; it does not make this a CPU model.
            pipe.enable_model_cpu_offload()
            pipe.enable_vae_slicing()
            pipe.unet.enable forward_chunking if False else None
            _pipeline = pipe
    return _pipeline


@spaces.GPU(duration=60)
def generate_video(image: Image.Image, movement_hint: str, progress=gr.Progress()):
    if image is None:
        raise gr.Error("Envie uma imagem do personagem.")
    image = prepare_image(image)
    # Stable Video Diffusion is image-conditioned, not text-conditioned:
    # movement_hint is retained for the workflow, but does not steer the model.
    progress(0.1, desc="Carregando o motor de vídeo...")
    pipe = get_pipeline()
    progress(0.35, desc="Gerando movimento a partir da imagem...")
    try:
        with torch.inference_mode():
            result = pipe(
                image,
                num_frames=14,
                num_inference_steps=12,
                decode_chunk_size=4,
                motion_bucket_id=127,
                noise_aug_strength=0.02,
            )
        frames = result.frames[0]
    except torch.cuda.OutOfMemoryError as exc:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise gr.Error(
            "A GPU ficou sem memória. Tente uma imagem simples ou aguarde outra sessão de GPU."
        ) from exc
    except Exception as exc:
        raise gr.Error(
            f"Falha ao gerar o clipe ({type(exc).__name__}). Confira os logs do Space."
        ) from exc

    output = tempfile.NamedTemporaryFile(prefix="lomi-teste-", suffix=".mp4", delete=False)
    output_path = output.name
    output.close()
    try:
        export_to_video(frames, output_path, fps=7)
        progress(1.0, desc="Clipe pronto.")
        return output_path, (
            "Teste concluído. Este clipe é curto e experimental; confira se o rosto, "
            "as cores e as proporções do personagem continuam reconhecíveis."
        )
    except Exception as exc:
        Path(output_path).unlink(missing_ok=True)
        raise gr.Error("Não foi possível exportar o MP4.") from exc


with gr.Blocks(title="Lomi — laboratório de movimento IA") as demo:
    gr.Markdown(
        """
        # Lomi — laboratório de movimento IA
        **Primeiro teste de vídeo:** envie uma imagem do personagem e gere um clipe MP4 curto.

        - O motor experimental tenta acrescentar movimento sem redesenhar todo o personagem.
        - O modelo não segue instruções textuais de ação; o campo abaixo é uma anotação para a produção.
        - A consistência visual não é garantida. Compare o resultado com a imagem original antes de usar no desenho.
        - Este Space usa GPU compartilhada e pode atingir limites de uso gratuito.
        """
    )
    with gr.Row():
        with gr.Column():
            source_image = gr.Image(label="Imagem do personagem", type="pil")
            movement_hint = gr.Textbox(
                label="Ação desejada (anotação da cena)",
                placeholder="Ex.: Lomi acena para os amigos",
                value="Movimento suave, personagem central, câmera fixa",
                max_lines=2,
            )
            generate = gr.Button("Gerar clipe de teste", variant="primary")
        with gr.Column():
            output_video = gr.Video(label="Resultado MP4", format="mp4")
            status = gr.Textbox(label="Resultado do teste", interactive=False)
    generate.click(
        fn=generate_video,
        inputs=[source_image, movement_hint],
        outputs=[output_video, status],
    )
    gr.Markdown(
        "Este é um protótipo isolado: ele não altera o site atual, não acessa o Supabase "
        "e não publica vídeos automaticamente."
    )

if __name__ == "__main__":
    demo.launch()
