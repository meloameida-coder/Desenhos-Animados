import { useMemo, useState } from 'react'
import { Check, Clipboard, ExternalLink, Film, ImagePlus, Sparkles, X } from 'lucide-react'

const initialScenePrompt = 'Cinematic 3D children animation, horizontal 16:9. In a sunny green forest, a little girl wearing a purple hoodie, blue jeans and pink shoes gently meets a cute gray rabbit with pink ears. She extends her hand and says in Brazilian Portuguese: “Olá! Vamos brincar?” The rabbit blinks, wiggles its ears and makes one happy little hop. Soft sunlight, expressive faces, smooth natural motion, family-friendly animated movie quality, consistent character appearance, stable camera, no cuts, no text on screen.'
const negativePrompt = 'blurry, distorted face, extra fingers, extra limbs, changing clothes, inconsistent character, flicker, camera shake, text, subtitles, watermark, horror, photorealistic humans'

export default function HybridStudio() {
  const [copied, setCopied] = useState(false)
  const [imageName, setImageName] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [scenePrompt, setScenePrompt] = useState(initialScenePrompt)
  const promptLength = useMemo(() => scenePrompt.length, [scenePrompt])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(scenePrompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      const field = document.querySelector<HTMLTextAreaElement>('#hybrid-scene-prompt')
      field?.focus()
      field?.select()
    }
  }

  function chooseImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    if (file.size > 10 * 1024 * 1024) {
      window.alert('Escolha uma imagem de até 10 MB.')
      return
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageName(file.name)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview('')
    setImageName('')
  }

  return <section className="workspace-page hybrid-studio-page">
    <div className="page-title-row"><div><div className="form-kicker">PRIMEIRO TESTE · SEM CUSTO AUTOMÁTICO</div><h1>Estúdio de animação IA</h1><p>Prepare a cena, personalize o prompt e teste a geração numa ferramenta externa. Nenhum pedido pago é enviado por esta tela.</p></div></div>
    <div className="hybrid-hero"><div className="hybrid-hero-art"><div className="hybrid-sun"/><div className="hybrid-hill hybrid-hill-back"/><div className="hybrid-hill hybrid-hill-front"/><div className="hybrid-tree tree-one"/><div className="hybrid-tree tree-two"/><div className="hybrid-girl"><span className="girl-head"/><span className="girl-body"/><span className="girl-leg leg-one"/><span className="girl-leg leg-two"/></div><div className="hybrid-rabbit"><span className="rabbit-ear rabbit-ear-one"/><span className="rabbit-ear rabbit-ear-two"/><span className="rabbit-head"/><span className="rabbit-body"/></div></div><div className="hybrid-hero-copy"><span className="hero-tag"><Sparkles size={14}/> CENA 01 · FLORESTA ENSOLARADA</span><h2>Uma nova amizade</h2><p>A menina de moletom roxo encontra um coelho cinza. Ela estende a mão e pergunta: “Olá! Vamos brincar?”</p><div className="hybrid-tags"><span>8 segundos</span><span>16:9 horizontal</span><span>Estilo 3D infantil</span></div></div></div>
    <div className="hybrid-work-grid">
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><Film size={21}/></div><div><h2>Prompt da cena</h2><p>Edite o texto antes de copiar para o gerador de vídeo.</p></div></div><label className="hybrid-field-label" htmlFor="hybrid-scene-prompt">Descrição em inglês (costuma funcionar melhor em vários geradores)</label><textarea id="hybrid-scene-prompt" value={scenePrompt} onChange={e => { setScenePrompt(e.target.value); setCopied(false) }} rows={7}/><div className="hybrid-prompt-meta"><span>{promptLength} caracteres</span><span>Formato 16:9</span></div><div className="hybrid-actions"><button className="primary-button" onClick={() => void copyPrompt()}>{copied ? <Check size={17}/> : <Clipboard size={17}/>} {copied ? 'Prompt copiado' : 'Copiar prompt'}</button><button className="secondary-button" onClick={() => { setScenePrompt(initialScenePrompt); setCopied(false) }}>Restaurar original</button></div><div className="hybrid-negative"><strong>Prompt negativo opcional</strong><p>{negativePrompt}</p></div></article>
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><ImagePlus size={21}/></div><div><h2>Imagem de referência</h2><p>Pré-visualize uma imagem neste navegador.</p></div></div><label className="hybrid-upload-zone"><ImagePlus size={24}/><strong>{imageName || 'Escolher imagem de referência'}</strong><span>JPG, PNG ou WEBP · máximo 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseImage(e.target.files?.[0])}/></label>{imagePreview && <div className="hybrid-reference-preview"><img src={imagePreview} alt="Prévia da imagem de referência selecionada"/><button type="button" className="secondary-button" onClick={clearImage}><X size={15}/> Remover imagem</button></div>}<div className="hybrid-checklist"><strong>Antes de gerar</strong><span>✓ Use uma imagem de referência, se o gerador aceitar</span><span>✓ Selecione 16:9 horizontal</span><span>✓ Cole o prompt no campo da ferramenta</span><span>✓ Baixe o MP4 para guardar no projeto</span></div><a className="primary-button hybrid-open-link" href="https://wan2.video/" target="_blank" rel="noreferrer">Abrir Wan2.Video <ExternalLink size={16}/></a><p className="hybrid-disclaimer">A imagem selecionada fica apenas como prévia temporária neste navegador; não é enviada ao Supabase nem ao gerador. A página pública pode falhar ou limitar gerações.</p></article>
    </div>
    <div className="notice info-notice hybrid-next-step"><strong>Próxima etapa:</strong> conectar o envio de imagens e vídeos à biblioteca existente, com acesso autenticado e sem expor chaves secretas no navegador.</div>
  </section>
}
