import os
import tempfile
import threading
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError

MODEL_ID = os.getenv("WAN_MODEL_ID", "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers")
API_TOKEN = os.getenv("AI_ENGINE_TOKEN", "")
MAX_IMAGE_BYTES = 12 * 1024 * 1024
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}

app = FastAPI(title="Desenhos Animados — Motor de Animação", version="0.1.0")
pipe = None
model_lock = threading.Lock()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "self-hosted-open-model",
        "model": MODEL_ID,
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": pipe is not None,
    }


def authorize(authorization: Optional[str]):
    if not API_TOKEN:
        raise HTTPException(status_code=503, detail="Configure AI_ENGINE_TOKEN no servidor.")
    if authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Token inválido.")


def load_pipeline():
    global pipe
    if pipe is not None:
        return pipe
    if not torch.cuda.is_available():
        raise HTTPException(
            status_code=503,
            detail="Este motor de vídeo precisa de GPU NVIDIA/CUDA. A hospedagem atual não oferece GPU compatível.",
        )
    from diffusers import WanImageToVideoPipeline

    # Keep a single pipeline per process; CPU offload lowers VRAM use but does not
    # make the 14B model practical on ordinary free CPU hosting.
    pipe = WanImageToVideoPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
    )
    pipe.enable_model_cpu_offload()
    return pipe


@app.post("/animate")
async def animate(
    image: UploadFile = File(...),
    prompt: str = Form("A personagem faz movimentos naturais e suaves."),
    authorization: Optional[str] = Header(default=None),
):
    authorize(authorization)
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Envie uma imagem PNG, JPEG ou WebP.")
    raw = await image.read()
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="A imagem deve ter até 12 MB.")
    prompt = prompt.strip()[:1200]
    if not prompt:
        prompt = "A personagem faz movimentos naturais e suaves."

    try:
        from io import BytesIO
        init_image = Image.open(BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="O arquivo enviado não é uma imagem válida.")

    # Wan I2V 480P expects dimensions divisible by 16. Keep a 832x480 or
    # 480x832 canvas according to source orientation.
    if init_image.width >= init_image.height:
        target = (832, 480)
    else:
        target = (480, 832)
    init_image.thumbnail(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", target, (0, 0, 0))
    canvas.paste(init_image, ((target[0] - init_image.width) // 2, (target[1] - init_image.height) // 2))

    with model_lock:
        pipeline = load_pipeline()
        try:
            result = pipeline(
                image=canvas,
                prompt=prompt,
                negative_prompt="blurry, distorted face, extra limbs, flicker, text, watermark",
                num_frames=49,
                guidance_scale=5.0,
                num_inference_steps=30,
            )
            frames = result.frames[0]
        except torch.cuda.OutOfMemoryError:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise HTTPException(
                status_code=507,
                detail="Memória de GPU insuficiente para este modelo. Use uma GPU maior ou um modelo mais leve.",
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Falha na geração local: {type(exc).__name__}") from exc

    from diffusers.utils import export_to_video
    fd, output_path = tempfile.mkstemp(suffix=".mp4", prefix="animacao-")
    os.close(fd)
    try:
        export_to_video(frames, output_path, fps=16)
    except Exception:
        Path(output_path).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Não foi possível exportar o vídeo.")
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="desenho-animado.mp4",
        background=None,
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
