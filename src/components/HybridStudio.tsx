import { useEffect, useMemo, useState } from 'react'
import { Check, Clipboard, ExternalLink, Film, ImagePlus, Sparkles, X, CloudUpload, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ProjectOption = { id: string; title: string }
type HybridStudioProps = { userId: string; projects: ProjectOption[] }

const initialScenePrompt = 'Cinematic 3D children animation, horizontal 16:9. In a sunny green forest, a little girl wearing a purple hoodie, blue jeans and pink shoes gently meets a cute gray rabbit with pink ears. She extends her hand and says in Brazilian Portuguese: “Olá! Vamos brincar?” The rabbit blinks, wiggles its ears and makes one happy little hop. Soft sunlight, expressive faces, smooth natural motion, family-friendly animated movie quality, consistent character appearance, stable camera, no cuts, no text on screen.'
const negativePrompt = 'blurry, distorted face, extra fingers, extra limbs, changing clothes, inconsistent character, flicker, camera shake, text, subtitles, watermark, horror, photorealistic humans'

export default function HybridStudio({ userId, projects }: HybridStudioProps) {
  const [copied, setCopied] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageName, setImageName] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [scenePrompt, setScenePrompt] = useState(initialScenePrompt)
  const [projectId, setProjectId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoName, setVideoName] = useState('')
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoMessage, setVideoMessage] = useState('')
  const [videoError, setVideoError] = useState('')
  const [sceneStatus, setSceneStatus] = useState('prepared')
  const [sceneNotes, setSceneNotes] = useState('')
  const [sceneId, setSceneId] = useState('')
  const [sceneSaving, setSceneSaving] = useState(false)
  const [sceneSaveMessage, setSceneSaveMessage] = useState('')
  const [sceneSaveError, setSceneSaveError] = useState('')
  const promptLength = useMemo(() => scenePrompt.length, [scenePrompt])

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])


  useEffect(() => {
    let cancelled = false
    async function loadScene() {
      setSceneId('')
      setSceneSaveMessage('')
      setSceneSaveError('')
      if (!supabase || !userId || !projectId) return
      const { data, error } = await supabase.from('scenes').select('id,title,video_prompt,camera_notes,generation_status').eq('project_id', projectId).eq('user_id', userId).eq('title', 'Uma nova amizade').order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (cancelled) return
      if (error) { setSceneSaveError('Não foi possível carregar a cena salva: ' + error.message); return }
      if (data) { setSceneId(data.id); if (data.video_prompt) setScenePrompt(data.video_prompt); if (data.camera_notes) setSceneNotes(data.camera_notes); if (data.generation_status) setSceneStatus(data.generation_status) }
    }
    void loadScene()
    return () => { cancelled = true }
  }, [projectId, userId])

  async function saveScene() {
    if (!supabase || !userId) { setSceneSaveError('Entre na sua conta para salvar a cena.'); return }
    if (!projectId) { setSceneSaveError('Selecione um projeto antes de salvar a cena.'); return }
    setSceneSaving(true); setSceneSaveError(''); setSceneSaveMessage('')
    const payload = { user_id: userId, project_id: projectId, scene_number: 1, title: 'Uma nova amizade', location: 'Floresta ensolarada', action_description: 'Menina de moletom roxo encontra um coelho cinza e pergunta: “Olá! Vamos brincar?”', video_prompt: scenePrompt, duration_seconds: 8, camera_notes: sceneNotes.trim() || null, generation_status: sceneStatus }
    try {
      if (sceneId) {
        const { error } = await supabase.from('scenes').update(payload).eq('id', sceneId).eq('user_id', userId).eq('project_id', projectId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('scenes').insert(payload).select('id').single()
        if (error) throw error
        if (data?.id) setSceneId(data.id)
      }
      setSceneSaveMessage('Cena salva no Supabase. Você pode continuar em outro dispositivo usando a mesma conta.')
    } catch (error) {
      setSceneSaveError(error instanceof Error ? 'Não foi possível salvar a cena: ' + error.message : 'Não foi possível salvar a cena.')
    } finally { setSceneSaving(false) }
  }

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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Escolha uma imagem JPG, PNG ou WEBP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Escolha uma imagem de até 10 MB.')
      return
    }
    setUploadError('')
    setUploadMessage('')
    setImageFile(file)
    setImageName(file.name)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview('')
    setImageName('')
    setUploadMessage('')
    setUploadError('')
  }

  async function uploadReference() {
    if (!supabase || !userId) {
      setUploadError('É necessário entrar na sua conta para salvar arquivos.')
      return
    }
    if (!projectId) {
      setUploadError('Selecione o projeto onde deseja guardar a imagem.')
      return
    }
    if (!imageFile) {
      setUploadError('Escolha uma imagem antes de enviar.')
      return
    }
    setUploading(true)
    setUploadError('')
    setUploadMessage('')
    const safeName = imageFile.name.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'referencia'
    const storagePath = userId + '/' + projectId + '/' + crypto.randomUUID() + '-' + safeName
    try {
      const { error: storageError } = await supabase.storage.from('creative-media').upload(storagePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      })
      if (storageError) throw storageError
      const { error: rowError } = await supabase.from('media_assets').insert({
        user_id: userId,
        project_id: projectId,
        asset_type: 'image',
        title: imageFile.name,
        storage_path: storagePath,
        mime_type: imageFile.type,
        metadata: { size_bytes: imageFile.size, source: 'hybrid-studio-reference' },
      })
      if (rowError) {
        await supabase.storage.from('creative-media').remove([storagePath])
        throw rowError
      }
      setUploadMessage('Imagem salva na Biblioteca de mídia do projeto selecionado.')
      window.dispatchEvent(new Event('creative-media-updated'))
    } catch (error) {
      setUploadError(error instanceof Error ? 'Não foi possível salvar a imagem: ' + error.message : 'Não foi possível salvar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  function chooseVideo(file?: File) {
    if (!file) return
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      setVideoError('Escolha um vídeo MP4 ou WEBM.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setVideoError('O vídeo deve ter no máximo 50 MB.')
      return
    }
    setVideoError('')
    setVideoMessage('')
    setVideoFile(file)
    setVideoName(file.name)
  }

  async function uploadVideo() {
    if (!supabase || !userId) {
      setVideoError('É necessário entrar na sua conta para salvar arquivos.')
      return
    }
    if (!projectId) {
      setVideoError('Selecione o projeto antes de enviar o vídeo.')
      return
    }
    if (!videoFile) {
      setVideoError('Escolha um vídeo antes de enviar.')
      return
    }
    setVideoUploading(true)
    setVideoError('')
    setVideoMessage('')
    const safeName = videoFile.name.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'cena'
    const storagePath = userId + '/' + projectId + '/' + crypto.randomUUID() + '-' + safeName
    try {
      const { error: storageError } = await supabase.storage.from('creative-media').upload(storagePath, videoFile, {
        contentType: videoFile.type,
        upsert: false,
      })
      if (storageError) throw storageError
      const { error: rowError } = await supabase.from('media_assets').insert({
        user_id: userId,
        project_id: projectId,
        asset_type: 'video',
        title: videoFile.name,
        storage_path: storagePath,
        mime_type: videoFile.type,
        metadata: { size_bytes: videoFile.size, source: 'hybrid-studio-scene-video' },
      })
      if (rowError) {
        await supabase.storage.from('creative-media').remove([storagePath])
        throw rowError
      }
      setVideoMessage('Vídeo salvo na Biblioteca de mídia do projeto selecionado.')
      window.dispatchEvent(new Event('creative-media-updated'))
    } catch (error) {
      setVideoError(error instanceof Error ? 'Não foi possível salvar o vídeo: ' + error.message : 'Não foi possível salvar o vídeo.')
    } finally {
      setVideoUploading(false)
    }
  }

  return <section className="workspace-page hybrid-studio-page">
    <div className="page-title-row"><div><div className="form-kicker">PRIMEIRO TESTE · SEM CUSTO AUTOMÁTICO</div><h1>Estúdio de animação IA</h1><p>Prepare a cena, personalize o prompt e salve imagens de referência na sua biblioteca. Nenhum pedido pago é enviado por esta tela.</p></div></div>
    <div className="hybrid-hero"><div className="hybrid-hero-art"><div className="hybrid-sun"/><div className="hybrid-hill hybrid-hill-back"/><div className="hybrid-hill hybrid-hill-front"/><div className="hybrid-tree tree-one"/><div className="hybrid-tree tree-two"/><div className="hybrid-girl"><span className="girl-head"/><span className="girl-body"/><span className="girl-leg leg-one"/><span className="girl-leg leg-two"/></div><div className="hybrid-rabbit"><span className="rabbit-ear rabbit-ear-one"/><span className="rabbit-ear rabbit-ear-two"/><span className="rabbit-head"/><span className="rabbit-body"/></div></div><div className="hybrid-hero-copy"><span className="hero-tag"><Sparkles size={14}/> CENA 01 · FLORESTA ENSOLARADA</span><h2>Uma nova amizade</h2><p>A menina de moletom roxo encontra um coelho cinza. Ela estende a mão e pergunta: “Olá! Vamos brincar?”</p><div className="hybrid-tags"><span>8 segundos</span><span>16:9 horizontal</span><span>Estilo 3D infantil</span></div></div></div>
    <article className="hybrid-panel hybrid-status-panel">
      <div className="hybrid-panel-heading"><div className="module-empty-icon"><Film size={21}/></div><div><h2>Acompanhamento da cena 01</h2><p>Marque manualmente em que etapa está a cena “Uma nova amizade”.</p></div></div>
      <label className="hybrid-field-label" htmlFor="hybrid-scene-status">Status da cena</label>
      <select id="hybrid-scene-status" className="hybrid-project-select" value={sceneStatus} onChange={e => setSceneStatus(e.target.value)}>
        <option value="prepared">Preparada</option><option value="generating">Em geração</option><option value="completed">Concluída</option><option value="error">Com erro / precisa refazer</option>
      </select>
      <label className="hybrid-field-label hybrid-notes-label" htmlFor="hybrid-scene-notes">Anotações (opcional)</label>
      <textarea id="hybrid-scene-notes" value={sceneNotes} onChange={e => setSceneNotes(e.target.value)} rows={2} placeholder="Ex.: ajustar o movimento das orelhas ou refazer a fala."/>
      <div className="hybrid-actions"><button type="button" className="primary-button" onClick={() => void saveScene()} disabled={sceneSaving || !projectId}><CloudUpload size={17}/>{sceneSaving ? "Salvando cena..." : sceneId ? "Atualizar cena salva" : "Salvar cena no projeto"}</button></div>{sceneSaveError && <div className="notice error-notice hybrid-upload-message">{sceneSaveError}</div>}{sceneSaveMessage && <div className="notice success-notice hybrid-upload-message">{sceneSaveMessage}</div>}<p className="hybrid-disclaimer">O prompt e as anotações de câmera são salvos na nuvem. O status de geração ainda é temporário e será persistido numa etapa própria.</p>
    </article>
    <div className="hybrid-work-grid">
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><Film size={21}/></div><div><h2>Prompt da cena</h2><p>Edite o texto antes de copiar para o gerador de vídeo.</p></div></div><label className="hybrid-field-label" htmlFor="hybrid-scene-prompt">Descrição em inglês (costuma funcionar melhor em vários geradores)</label><textarea id="hybrid-scene-prompt" value={scenePrompt} onChange={e => { setScenePrompt(e.target.value); setCopied(false) }} rows={7}/><div className="hybrid-prompt-meta"><span>{promptLength} caracteres</span><span>Formato 16:9</span></div><div className="hybrid-actions"><button className="primary-button" onClick={() => void copyPrompt()}>{copied ? <Check size={17}/> : <Clipboard size={17}/>} {copied ? 'Prompt copiado' : 'Copiar prompt'}</button><button className="secondary-button" onClick={() => { setScenePrompt(initialScenePrompt); setCopied(false) }}>Restaurar original</button></div><div className="hybrid-negative"><strong>Prompt negativo opcional</strong><p>{negativePrompt}</p></div></article>
      <article className="hybrid-panel"><div className="hybrid-panel-heading"><div className="module-empty-icon"><ImagePlus size={21}/></div><div><h2>Imagem de referência</h2><p>Escolha a imagem e salve uma cópia na nuvem.</p></div></div><label className="hybrid-upload-zone"><ImagePlus size={24}/><strong>{imageName || 'Escolher imagem de referência'}</strong><span>JPG, PNG ou WEBP · máximo 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseImage(e.target.files?.[0])}/></label>{imagePreview && <div className="hybrid-reference-preview"><img src={imagePreview} alt="Prévia da imagem de referência selecionada"/><button type="button" className="secondary-button" onClick={clearImage}><X size={15}/> Remover imagem</button></div>}
      <label className="hybrid-field-label" htmlFor="hybrid-project-select">Salvar no projeto</label><select id="hybrid-project-select" className="hybrid-project-select" value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Selecione um projeto...</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
      <button type="button" className="primary-button hybrid-save-button" onClick={() => void uploadReference()} disabled={uploading || !imageFile || !projectId}><CloudUpload size={17}/>{uploading ? 'Enviando para a nuvem...' : 'Salvar na Biblioteca'}</button>
      {uploadError && <div className="notice error-notice hybrid-upload-message">{uploadError}</div>}{uploadMessage && <div className="notice success-notice hybrid-upload-message">{uploadMessage}</div>}
      <div className="hybrid-video-upload">
        <div className="hybrid-panel-heading"><div className="module-empty-icon"><Video size={21}/></div><div><h2>Guardar vídeo gerado</h2><p>Depois de gerar e baixar a cena, envie o arquivo para a biblioteca do projeto.</p></div></div>
        <label className="hybrid-upload-zone"><Video size={24}/><strong>{videoName || 'Escolher vídeo da cena'}</strong><span>MP4 ou WEBM · máximo 50 MB</span><input type="file" accept="video/mp4,video/webm" onChange={e => chooseVideo(e.target.files?.[0])}/></label>
        <button type="button" className="primary-button hybrid-save-button" onClick={() => void uploadVideo()} disabled={videoUploading || !videoFile || !projectId}><CloudUpload size={17}/>{videoUploading ? 'Enviando vídeo...' : 'Salvar vídeo na Biblioteca'}</button>
        {videoError && <div className="notice error-notice hybrid-upload-message">{videoError}</div>}{videoMessage && <div className="notice success-notice hybrid-upload-message">{videoMessage}</div>}
      </div>
      <div className="hybrid-checklist"><strong>Antes de gerar</strong><span>✓ Use uma imagem de referência, se o gerador aceitar</span><span>✓ Selecione 16:9 horizontal</span><span>✓ Cole o prompt no campo da ferramenta</span><span>✓ Baixe o MP4 para guardar no projeto</span></div><a className="primary-button hybrid-open-link" href="https://wan2.video/" target="_blank" rel="noreferrer">Abrir Wan2.Video <ExternalLink size={16}/></a><p className="hybrid-disclaimer">A imagem só é enviada ao seu Supabase quando você clicar em “Salvar na Biblioteca”. A geração de vídeo continua manual e pode estar sujeita a limites da ferramenta externa.</p></article>
    </div>
    <div className="notice info-notice hybrid-next-step"><strong>Próxima etapa:</strong> registrar o status de cada cena e ligar a biblioteca ao acompanhamento do episódio.</div>
  </section>
}
