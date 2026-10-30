import { Client, handle_file } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

const spaceId = "Lightricks/LTX-2.5";
const imageInput = document.getElementById("ltxImage");
const generateButton = document.getElementById("ltxGenerate");
const promptInput = document.getElementById("aiPromptOutput");
const statusNode = document.getElementById("ltxStatus");
const resultNode = document.getElementById("ltxResult");
const downloadLink = document.getElementById("ltxDownload");
const durationInput = document.getElementById("ltxDuration");

let clientPromise;

function status(message) {
  if (statusNode) statusNode.textContent = message;
}

function connect() {
  if (!clientPromise) {
    clientPromise = Client.connect(spaceId, { events: ["status", "data"] });
  }
  return clientPromise;
}

function endpointFromApi(api) {
  const endpoints = api?.named_endpoints || {};
  for (const [name, definition] of Object.entries(endpoints)) {
    const params = definition?.parameters || [];
    const returns = definition?.returns || [];
    if (params.length === 10 && returns.length >= 4) return name;
  }
  throw new Error("A API pública do LTX mudou ou não está disponível. Não foi possível identificar o endpoint de geração.");
}

function dimensions(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const ratio = image.naturalWidth / image.naturalHeight;
      let height, width;
      if (ratio >= 1) {
        height = 832;
        width = Math.min(1536, Math.max(832, Math.round((832 * ratio) / 64) * 64));
      } else {
        width = 832;
        height = Math.min(1536, Math.max(832, Math.round((832 / ratio) / 64) * 64));
      }
      URL.revokeObjectURL(url);
      resolve({ height, width });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    image.src = url;
  });
}

function getVideoUrl(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.url === "string") return value.url;
  if (value && typeof value.path === "string" && /^https?:/.test(value.path)) return value.path;
  return null;
}

generateButton?.addEventListener("click", async () => {
  const image = imageInput?.files?.[0];
  const prompt = promptInput?.value?.trim();
  if (!image) {
    status("Selecione a imagem do personagem para animar.");
    imageInput?.focus();
    return;
  }
  if (!prompt) {
    status("Prepare o prompt da cena antes de gerar.");
    promptInput?.focus();
    return;
  }
  if (image.size > 10 * 1024 * 1024) {
    status("A imagem ultrapassa 10 MB. Escolha uma imagem menor.");
    return;
  }
  if (!/^image\/(png|jpeg|webp)$/.test(image.type)) {
    status("Formato não aceito. Use PNG, JPG ou WebP.");
    return;
  }

  generateButton.disabled = true;
  resultNode.hidden = true;
  downloadLink.hidden = true;
  status("Conectando ao LTX-2.5 e verificando a API pública…");

  try {
    const client = await connect();
    const api = await client.view_api();
    const endpoint = endpointFromApi(api);
    const { height, width } = await dimensions(image);
    const duration = Number(durationInput?.value || 2);
    const seed = Math.floor(Math.random() * 2147483647);
    status("Enviando imagem e prompt ao LTX-2.5. A fila gratuita pode demorar; mantenha esta página aberta…");

    const job = client.submit(endpoint, [
      prompt,
      handle_file(image),
      height,
      width,
      duration,
      seed,
      "conv",
      false,
      true,
      true
    ]);

    let output = null;
    for await (const message of job) {
      if (message.type === "status") {
        const s = message;
        if (s.stage === "pending") {
          const place = Number.isFinite(s.position) ? " Posição na fila: " + (s.position + 1) + "." : "";
          status("Pedido aguardando na fila gratuita do Hugging Face." + place);
        } else if (s.stage === "generating") {
          status("LTX-2.5 está gerando o vídeo e o áudio. Aguarde…");
        } else if (s.stage === "error") {
          throw new Error(s.message || "O gerador informou um erro.");
        }
      } else if (message.type === "data") {
        output = message.data;
      }
    }

    if (!Array.isArray(output) || !output.length) {
      throw new Error("O LTX-2.5 terminou sem retornar um arquivo de vídeo.");
    }
    const videoUrl = getVideoUrl(output[0]);
    if (!videoUrl) {
      throw new Error("O gerador respondeu, mas o endereço do MP4 veio em formato inesperado.");
    }

    const video = document.getElementById("ltxVideo");
    video.src = videoUrl;
    resultNode.hidden = false;
    downloadLink.href = videoUrl;
    downloadLink.download = "lomi-cena-ltx25.mp4";
    downloadLink.hidden = false;

    const generatedLength = output[3] || "Duração informada pelo gerador";
    status("Vídeo recebido com sucesso! " + generatedLength + ". Assista abaixo e use Baixar MP4 para guardar no seu dispositivo.");
  } catch (error) {
    const message = error?.message || String(error);
    status("Não foi possível concluir a geração: " + message + " Confira se o Space está ativo e tente novamente mais tarde. Nenhuma cobrança foi iniciada pelo Lomi.");
  } finally {
    generateButton.disabled = false;
  }
});

if (generateButton) {
  status("Pronto para conectar ao LTX-2.5. Escolha uma imagem, prepare o prompt e clique em Gerar vídeo com IA.");
}
