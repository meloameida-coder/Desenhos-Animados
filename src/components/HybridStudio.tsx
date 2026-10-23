import { useMemo, useState } from 'react'
import { Check, Clipboard, ExternalLink, Film, ImagePlus, Sparkles } from 'lucide-react'

const scenePrompt = 'Cinematic 3D children animation, horizontal 16:9. In a sunny green forest, a little girl wearing a purple hoodie, blue jeans and pink shoes gently meets a cute gray rabbit with pink ears. She extends her hand and says in Brazilian Portuguese: “Olá! Vamos brincar?” The rabbit blinks, wiggles its ears and makes one happy little hop. Soft sunlight, expressive faces, smooth natural motion, family-friendly animated movie quality, consistent character appearance, stable camera, no cuts, no text on screen.'
const negativePrompt = 'blurry, distorted face, extra fingers, extra limbs, changing clothes, inconsistent character, flicker, camera shake, text, subtitles, watermark, horror, photorealistic humans'

export default function HybridStudio() {
  const [copied, setCopied] = useState(false)
  const [imageName, setImageName] = useState('')
  const promptLength = useMemo(() => scenePrompt.length, [])
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(scenePrompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      const field = document.querySelector<HTMLTextAreaElement>('#hybrid-scene-prompt')
      field?.focus(); field?.select()
    }
  }
  return <section className="workspace-page hybrid-studio-page">
    <div className="page-title-row"><div><div className="form-kicker">PRIMEIRO TESTE · SEM CUSTO AUTOMÁTICO</div><h1>Estúdio de animação IA</h1><p>Prepare a cena, copie o prompt e teste a geração numa ferramenta externa. Esta etapa não envia pedidos pagos.</p></div></div>
    <div className="hybrid-hero"><div className="hybrid-hero-art"><div className="hybrid-sun"/><div className="hybrid-hill hybrid-hill-back"/><div className="hybrid-hill hybrid-hill-front"/><div className="hybrid-tree tree-one"/><div className="hybrid-tree tree-two"/><div className="hybrid-girl"><span className="girl-head"/><span className="girl-body"/><span className="girl-leg leg-one"/><span className="girl-leg leg-two"/></div><div className="hybrid-rabbit"><span className="rabbit-ear rabbit-ear-one"/><span className="rabbit-ear rabbit-ear-two"/><span className="rabbit-head"/><span className="rabbit-body"/></div></div><div className="hybrid-hero-copy"><span className="hero-tag"><Sparkles size={14}/> CENA 01 · FLORESTA ENSOLARADA</span><h2>Uma nova amizade</h2><p>A menina de moletom roxo encontra um coelho cinza. Ela estende a mão e pergunta: “Olá! Vamos brincar?”</p><div className="hybrid-tags"><span>8 segundos</span><span>16:9 horizontal</span><span>Estilo 3D infantil</span></div></div></div>
    <div className="hybrid-work-grid">
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><Film size={21}/></div><div><h2>Prompt da cena</h2><p>Pronto para copiar e usar no gerador de vídeo.</p></div></div><label className="hybrid-field-label" htmlFor="hybrid-scene-prompt">Descrição em inglês (costuma funcionar melhor em vários geradores)</label><textarea id="hybrid-scene-prompt" readOnly value={scenePrompt} rows={7}/><div className="hybrid-prompt-meta"><span>{promptLength} caracteres</span><span>Formato 16:9</span></div><button className="primary-button" onClick={() => void copyPrompt()}>{copied ? <Check size={17}/> : <Clipboard size={17}/>} {copied ? 'Prompt copiado' : 'Copiar prompt'}</button><div className="hybrid-negative"><strong>Prompt negativo opcional</strong><p>{negativePrompt}</p></div></article>
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><ImagePlus size={21}/></div><div><h2>Imagem de referência</h2><p>Selecione a imagem do personagem que você já criou, se tiver.</p></div></div><label className="hybrid-upload-zone"><ImagePlus size={24}/><strong>{imageName || 'Escolher imagem de referência'}</strong><span>JPG, PNG ou WEBP · a imagem não é enviada por este painel</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageName(e.target.files?.[0]?.name || '')}/></label><div className="hybrid-checklist"><strong>Antes de gerar</strong><span>✓ Escolha imagem para animar, se a ferramenta pedir</span><span>✓ Selecione 16:9 horizontal</span><span>✓ Cole o prompt no campo da ferramenta</span><span>✓ Baixe o MP4 gerado para guardar no projeto</span></div><a className="primary-button hybrid-open-link" href="https://wan2.video/" target="_blank" rel="noreferrer">Abrir Wan2.Video <ExternalLink size={16}/></a><p className="hybrid-disclaimer">A página pública pode falhar ou limitar gerações. Se não funcionar, não significa que nosso site esteja quebrado. Esta versão não automatiza a geração nem envia arquivos a terceiros.</p></article>
    </div>
    <div className="notice info-notice hybrid-next-step"><strong>Depois de gerar:</strong> volte à Biblioteca de mídia e envie o vídeo MP4 para o projeto. A ligação automática com um gerador só será adicionada depois de confirmar uma API oficial, autorizada e com custos aceitáveis.</div>
  </section>
}
