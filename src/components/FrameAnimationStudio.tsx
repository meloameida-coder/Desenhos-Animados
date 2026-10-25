import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Play, Pause, Download, Trash2, Move, Info, ArrowUp, ArrowDown, Eye, EyeOff, Copy, Cloud, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ProjectOption = { id: string; title: string }
type SavedScene = { id: string; title: string; metadata: Record<string, any>; created_at: string }

type MotionStyle = 'parado' | 'deslizar' | 'dançar' | 'pular'
type BackgroundStyle = 'campo' | 'quarto' | 'palco'
type Layer = { id: string; name: string; image: HTMLImageElement; x: number; y: number; width: number; height: number; dx: number; dy: number; motion: MotionStyle; visible: boolean }
const W = 960
const H = 540

export default function FrameAnimationStudio({ userId, projects }: { userId: string; projects: ProjectOption[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layersRef = useRef<Layer[]>([])
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(0)
  const playingRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(6)
  const [background, setBackground] = useState<BackgroundStyle>('campo')
  const [status, setStatus] = useState('Importe imagens PNG transparentes separadas para começar.')
  const [selectedId, setSelectedId] = useState('')
  const [recording, setRecording] = useState(false)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([])
  const [selectedSavedScene, setSelectedSavedScene] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)

  useEffect(() => { layersRef.current = layers; draw(0) }, [layers, background])
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); recorderRef.current?.stop() }, [])


  async function refreshCloudScenes() {
    if (!supabase || !projectId) { setSavedScenes([]); return }
    const { data, error } = await supabase.from('media_assets').select('id,title,metadata,created_at')
      .eq('project_id', projectId).eq('user_id', userId).eq('asset_type', 'other')
      .order('created_at', { ascending: false })
    if (error) { setStatus('Não consegui listar as cenas na nuvem: ' + error.message); return }
    setSavedScenes(((data ?? []) as SavedScene[]).filter(item => item.metadata?.format === 'desenhos-animados-scene' && Array.isArray(item.metadata?.layers)))
  }

  useEffect(() => {
    if (projects.length && !projects.some(project => project.id === projectId)) {
      setProjectId(projects[0].id)
    }
  }, [projects, projectId])

  useEffect(() => { void refreshCloudScenes() }, [projectId, userId])

  async function saveCloudScene() {
    if (!supabase) { setStatus('Supabase não configurado.'); return }
    if (!projectId) { setStatus('Crie ou selecione um projeto antes de salvar na nuvem.'); return }
    if (!layersRef.current.length) { setStatus('Importe pelo menos uma camada antes de salvar.'); return }
    setCloudBusy(true)
    const sceneId = crypto.randomUUID()
    const uploadedPaths: string[] = []
    try {
      const manifestLayers = []
      for (let i = 0; i < layersRef.current.length; i++) {
        const layer = layersRef.current[i]
        const imageCanvas = document.createElement('canvas')
        imageCanvas.width = layer.image.naturalWidth
        imageCanvas.height = layer.image.naturalHeight
        const ctx = imageCanvas.getContext('2d')
        if (!ctx) throw new Error('Não foi possível preparar uma imagem.')
        ctx.drawImage(layer.image, 0, 0)
        const blob = await new Promise<Blob>((resolve, reject) => imageCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao converter imagem.')), 'image/png'))
        const path = userId + '/' + projectId + '/animation-scenes/' + sceneId + '/layer-' + i + '.png'
        const { error: uploadError } = await supabase.storage.from('creative-media').upload(path, blob, { contentType: 'image/png', upsert: false })
        if (uploadError) throw uploadError
        uploadedPaths.push(path)
        manifestLayers.push({ name: layer.name, storage_path: path, x: layer.x, y: layer.y, width: layer.width, height: layer.height, dx: layer.dx, dy: layer.dy, motion: layer.motion, visible: layer.visible })
      }
      const title = 'Cena ' + new Date().toLocaleString('pt-BR')
      const { error: insertError } = await supabase.from('media_assets').insert({
        user_id: userId, project_id: projectId, asset_type: 'other', title, storage_path: manifestLayers[0].storage_path, mime_type: 'application/json',
        metadata: { format: 'desenhos-animados-scene', version: 1, duration, background, layers: manifestLayers }
      })
      if (insertError) throw insertError
      setStatus('Cena salva na nuvem com ' + manifestLayers.length + ' camada(s).')
      await refreshCloudScenes()
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('creative-media').remove(uploadedPaths)
      setStatus('Falha ao salvar na nuvem: ' + (error instanceof Error ? error.message : 'erro desconhecido'))
    } finally { setCloudBusy(false) }
  }

  async function openCloudScene() {
    if (!supabase || !selectedSavedScene) return
    const saved = savedScenes.find(item => item.id === selectedSavedScene)
    if (!saved) return
    setCloudBusy(true)
    try {
      const meta = saved.metadata
      if (meta?.format !== 'desenhos-animados-scene' || !Array.isArray(meta.layers) || meta.layers.length > 100) throw new Error('Formato de cena inválido.')
      const restored: Layer[] = []
      for (const item of meta.layers) {
        if (typeof item.storage_path !== 'string' || !item.storage_path.startsWith(userId + '/' + projectId + '/')) throw new Error('A cena contém um caminho de imagem inválido. Nenhuma camada foi ignorada.')
        const { data, error } = await supabase.storage.from('creative-media').download(item.storage_path)
        if (error || !data) throw error ?? new Error('Não foi possível baixar uma camada.')
        const image = new Image()
        const objectUrl = URL.createObjectURL(data)
        try {
          await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Imagem inválida')); image.src = objectUrl })
        } finally { URL.revokeObjectURL(objectUrl) }
        const width = Number.isFinite(item.width) ? Math.max(20, Math.min(W, item.width)) : Math.min(260, image.naturalWidth)
        const height = Number.isFinite(item.height) ? Math.max(20, Math.min(H, item.height)) : Math.min(300, image.naturalHeight)
        restored.push({ id: crypto.randomUUID(), name: typeof item.name === 'string' ? item.name.slice(0, 60) : 'Camada', image,
          x: Number.isFinite(item.x) ? Math.max(0, Math.min(W - width, item.x)) : 0,
          y: Number.isFinite(item.y) ? Math.max(0, Math.min(H - height, item.y)) : 0, width, height,
          dx: Number.isFinite(item.dx) ? Math.max(-500, Math.min(500, item.dx)) : 0,
          dy: Number.isFinite(item.dy) ? Math.max(-500, Math.min(500, item.dy)) : 0,
          motion: ['parado', 'deslizar', 'dançar', 'pular'].includes(item.motion) ? item.motion : 'deslizar', visible: item.visible !== false })
      }
      if (restored.length !== meta.layers.length) throw new Error('A cena não pôde ser restaurada por completo.')
      stopPlayback()
      setLayers(restored)
      setSelectedId(restored[0]?.id ?? '')
      setDuration([4, 6, 8, 12].includes(meta.duration) ? meta.duration : 6)
      setBackground(['campo', 'quarto', 'palco'].includes(meta.background) ? meta.background : 'campo')
      setStatus('Cena recuperada da nuvem com ' + restored.length + ' camada(s).')
    } catch (error) {
      setStatus('Não consegui abrir a cena da nuvem: ' + (error instanceof Error ? error.message : 'erro desconhecido'))
    } finally { setCloudBusy(false) }
  }

  function draw(elapsed: number) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, W, H)
    if (background === 'campo') {
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#c7eaff'); sky.addColorStop(1, '#fff1ce')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#a8dba0'; ctx.beginPath(); ctx.ellipse(210, 510, 380, 160, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#72bd82'; ctx.beginPath(); ctx.ellipse(730, 535, 430, 190, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f6d477'; ctx.beginPath(); ctx.arc(820, 95, 42, 0, Math.PI * 2); ctx.fill()
    } else if (background === 'quarto') {
      ctx.fillStyle = '#f4dff5'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#e6bfe8'; ctx.fillRect(0, 0, W, 350)
      ctx.fillStyle = '#f4c9a3'; ctx.fillRect(0, 350, W, 190)
      ctx.fillStyle = '#b6e0f2'; ctx.fillRect(85, 75, 190, 150)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(85, 75, 190, 150)
      ctx.fillStyle = '#dca6cf'; ctx.fillRect(620, 285, 220, 170)
      ctx.fillStyle = '#fff0a8'; ctx.fillRect(600, 270, 260, 30)
    } else {
      ctx.fillStyle = '#211d48'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#673e88'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(180, 0); ctx.lineTo(310, H); ctx.lineTo(0, H); ctx.fill()
      ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 180, 0); ctx.lineTo(W - 310, H); ctx.lineTo(W, H); ctx.fill()
      ctx.fillStyle = '#f6d477'
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(140 + i * 110, 90 + (i % 2) * 22, 4, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = '#3a3268'; ctx.fillRect(0, 420, W, 120)
    }
    for (const layer of layersRef.current) {
      if (!layer.visible) continue
      const phase = elapsed * 2 + parseInt(layer.id.slice(-2), 16)
      const active = playingRef.current && elapsed > 0 && layer.motion !== 'parado'
      const sway = active && layer.motion === 'dançar' ? Math.sin(phase * 1.7) * 10 : 0
      const hop = active && layer.motion === 'pular' ? Math.abs(Math.sin(phase * 2.2)) * 22 : 0
      const tilt = active && layer.motion === 'dançar' ? Math.sin(phase) * 0.07 : 0
      const x = layer.x + (active ? layer.dx * elapsed : 0) + sway
      const y = layer.y + (active ? layer.dy * elapsed : 0) - hop
      if (tilt) {
        ctx.save(); ctx.translate(x + layer.width / 2, y + layer.height / 2); ctx.rotate(tilt)
        ctx.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height); ctx.restore()
      } else ctx.drawImage(layer.image, x, y, layer.width, layer.height)
      if (selectedId === layer.id && !playingRef.current) {
        ctx.strokeStyle = '#6d4aff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(x, y, layer.width, layer.height); ctx.setLineDash([])
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(18, 18, 230, 34)
    ctx.fillStyle = '#24334a'; ctx.font = '600 14px system-ui'; ctx.fillText('ESTÚDIO 2D · PRÉVIA', 30, 40)
  }

  function stopPlayback() {
    playingRef.current = false; setPlaying(false)
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null; draw(0)
  }
  function startPlayback() {
    if (!layersRef.current.length) { setStatus('Importe pelo menos uma imagem antes de reproduzir.'); return }
    if (playingRef.current) return
    playingRef.current = true; setPlaying(true); startedRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - startedRef.current) / 1000
      if (elapsed >= duration) { stopPlayback(); setStatus('Prévia concluída. Você pode ajustar as camadas e exportar novamente.'); return }
      draw(elapsed); rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }
  async function importFiles(files: FileList | null) {
    if (!files?.length) return
    const next = [...layersRef.current]
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const url = URL.createObjectURL(file)
      const img = new Image()
      await new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); img.src = url })
      URL.revokeObjectURL(url)
      if (!img.naturalWidth) continue
      const scale = Math.min(260 / img.naturalWidth, 300 / img.naturalHeight, 1)
      const id = crypto.randomUUID()
      next.push({ id, name: file.name, image: img, x: 70 + (next.length % 3) * 220, y: 150, width: img.naturalWidth * scale, height: img.naturalHeight * scale, dx: 12 + (next.length % 2) * 12, dy: 0, motion: 'dançar', visible: true })
    }
    setLayers(next); setSelectedId(next.at(-1)?.id ?? '')
    setStatus('Imagens carregadas como camadas independentes. Selecione uma camada para ajustar o movimento.')
  }
  function updateLayer(id: string, patch: Partial<Layer>) {
    setLayers(current => current.map(layer => layer.id === id ? { ...layer, ...patch } : layer))
  }
  function removeLayer(id: string) {
    setLayers(current => current.filter(layer => layer.id !== id))
    if (selectedId === id) setSelectedId('')
  }
  function duplicateLayer(layer: Layer) {
    const id = crypto.randomUUID()
    const copy: Layer = { ...layer, id, name: `${layer.name} (cópia)`, x: Math.min(W - layer.width, layer.x + 24), y: Math.min(H - layer.height, layer.y + 24) }
    setLayers(current => [...current, copy])
    setSelectedId(id)
    setStatus(`Camada duplicada: ${copy.name}`)
  }
  function moveLayer(id: string, direction: -1 | 1) {
    setLayers(current => {
      const index = current.findIndex(layer => layer.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }
  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (playingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) * W / rect.width
    const y = (event.clientY - rect.top) * H / rect.height
    const layer = [...layersRef.current].reverse().find(item => item.visible && x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height)
    if (!layer) { setSelectedId(''); draw(0); return }
    setSelectedId(layer.id)
    const startX = x, startY = y, origX = layer.x, origY = layer.y
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      updateLayer(layer.id, { x: Math.max(0, Math.min(W - layer.width, origX + (e.clientX - startX) * W / r.width)), y: Math.max(0, Math.min(H - layer.height, origY + (e.clientY - startY) * H / r.height)) })
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  function exportVideo() {
    const canvas = canvasRef.current
    if (!canvas || !layersRef.current.length) { setStatus('Importe imagens antes de exportar.'); return }
    if (!('captureStream' in canvas) || typeof MediaRecorder === 'undefined') { setStatus('Este navegador não oferece gravação de canvas. Tente o Chrome ou Edge atualizado.'); return }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type))
    if (!mime) { setStatus('Este navegador não oferece um formato de vídeo compatível.'); return }
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = recorder; chunksRef.current = []; setRecording(true); setStatus('Gravando a animação para exportar...')
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'minha-animacao.webm'; a.click()
      URL.revokeObjectURL(url); stream.getTracks().forEach(track => track.stop())
      setRecording(false); stopPlayback(); setStatus('Vídeo WEBM exportado. Este protótipo ainda não exporta MP4 nem cria fala automática.')
    }
    recorder.start()
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      draw(elapsed)
      if (elapsed >= duration) { recorder.stop(); return }
      rafRef.current = requestAnimationFrame(tick)
    }
    playingRef.current = true; setPlaying(true); rafRef.current = requestAnimationFrame(tick)
  }

  async function saveScene() {
    try {
      const savedLayers = layersRef.current.map(layer => {
        const imageCanvas = document.createElement('canvas')
        imageCanvas.width = layer.image.naturalWidth
        imageCanvas.height = layer.image.naturalHeight
        const imageContext = imageCanvas.getContext('2d')
        if (!imageContext) throw new Error('Não foi possível preparar uma imagem.')
        imageContext.drawImage(layer.image, 0, 0)
        return { id: layer.id, name: layer.name, imageData: imageCanvas.toDataURL('image/png'), x: layer.x, y: layer.y, width: layer.width, height: layer.height, dx: layer.dx, dy: layer.dy, motion: layer.motion, visible: layer.visible }
      })
      const data = { format: 'desenhos-animados-scene', version: 1, duration, background, layers: savedLayers }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'minha-cena-animada.json'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('Cena salva em arquivo JSON com as imagens e posições. Guarde o arquivo para continuar depois.')
    } catch {
      setStatus('Não foi possível salvar a cena. Tente usar imagens menores ou menos camadas.')
    }
  }

  async function loadScene(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Arquivo muito grande')
      const data = JSON.parse(await file.text())
      if (data?.format !== 'desenhos-animados-scene' || data.version !== 1 || !Array.isArray(data.layers) || data.layers.length > 100) throw new Error('Arquivo inválido')
      const restored: Layer[] = []
      for (const item of data.layers) {
        if (typeof item.imageData !== 'string' || !item.imageData.startsWith('data:image/')) continue
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('Imagem inválida'))
          image.src = item.imageData
        })
        if (!image.naturalWidth || !image.naturalHeight) continue
        const motion: MotionStyle = ['parado', 'deslizar', 'dançar', 'pular'].includes(item.motion) ? item.motion : 'deslizar'
        restored.push({
          id: crypto.randomUUID(),
          name: typeof item.name === 'string' ? item.name.slice(0, 60) : 'Camada',
          image,
          x: 0,
          y: 0,
          width: Number.isFinite(item.width) ? Math.max(20, Math.min(W, item.width)) : Math.min(260, image.naturalWidth),
          height: Number.isFinite(item.height) ? Math.max(20, Math.min(H, item.height)) : Math.min(300, image.naturalHeight),
          dx: Number.isFinite(item.dx) ? Math.max(-500, Math.min(500, item.dx)) : 0,
          dy: Number.isFinite(item.dy) ? Math.max(-500, Math.min(500, item.dy)) : 0,
          motion,
          visible: item.visible !== false
        })
        const restoredLayer = restored[restored.length - 1]
        restoredLayer.x = Number.isFinite(item.x) ? Math.max(0, Math.min(W - restoredLayer.width, item.x)) : 0
        restoredLayer.y = Number.isFinite(item.y) ? Math.max(0, Math.min(H - restoredLayer.height, item.y)) : 0
      }
      stopPlayback()
      setLayers(restored)
      setSelectedId(restored[0]?.id ?? '')
      setDuration([4, 6, 8, 12].includes(data.duration) ? data.duration : 6)
      setBackground(['campo', 'quarto', 'palco'].includes(data.background) ? data.background : 'campo')
      setStatus('Cena recuperada com ' + restored.length + ' camada(s). Você pode continuar editando.')
    } catch {
      setStatus('Não consegui abrir esse arquivo. Escolha um JSON salvo pelo Editor de animação 2D.')
    }
  }

  const selected = layers.find(layer => layer.id === selectedId)

  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">PROTÓTIPO EXPERIMENTAL · SEM CHAMADAS PAGAS DE IA</div><h1>Editor de animação 2D</h1><p>Monte uma cena com camadas separadas, escolha movimentos simples por camada e exporte uma prévia em vídeo.</p></div></div>
    <div className="hybrid-panel" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <label className="primary-button" style={{ cursor: 'pointer' }}><ImagePlus size={17} /> Importar imagens<input type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={e => { void importFiles(e.target.files); e.currentTarget.value = '' }} /></label>
        <button className="secondary-button" onClick={playing ? stopPlayback : startPlayback}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Parar prévia' : 'Reproduzir prévia'}</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Projeto <select value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Selecione…</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><button className="primary-button" onClick={() => void saveCloudScene()} disabled={cloudBusy || !projectId}><Cloud size={16}/> {cloudBusy ? 'Salvando…' : 'Salvar na nuvem'}</button><button className="secondary-button" onClick={() => void saveScene()}><Download size={16}/> Exportar JSON</button><button className="secondary-button" onClick={() => void refreshCloudScenes()} disabled={cloudBusy}><RefreshCw size={16}/> Atualizar cenas</button><select value={selectedSavedScene} onChange={e => setSelectedSavedScene(e.target.value)}><option value="">Escolha uma cena salva…</option>{savedScenes.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}</select><button className="secondary-button" onClick={() => void openCloudScene()} disabled={cloudBusy || !selectedSavedScene}>Abrir da nuvem</button><label className="secondary-button" style={{ cursor: 'pointer' }}>Abrir cena<input type="file" accept="application/json,.json" hidden onChange={e => { void loadScene(e.target.files?.[0]); e.currentTarget.value = '' }} /></label><button className="primary-button" onClick={exportVideo} disabled={recording}><Download size={16}/> {recording ? 'Exportando…' : 'Exportar vídeo WEBM'}</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Duração <select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={4}>4 s</option><option value={6}>6 s</option><option value={8}>8 s</option><option value={12}>12 s</option></select></label><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Cenário <select value={background} onChange={e => setBackground(e.target.value as BackgroundStyle)}><option value="campo">Campo</option><option value="quarto">Quarto</option><option value="palco">Palco musical</option></select></label>
      </div>
      <canvas ref={canvasRef} width={W} height={H} onPointerDown={pointerDown} style={{ width: '100%', display: 'block', borderRadius: 12, border: '1px solid #ddd9ee', cursor: playing ? 'default' : 'grab', touchAction: 'none' }} />
      <p style={{ color: '#686579', fontSize: 13, marginBottom: 0 }}>Dica: importe personagens em PNG com fundo transparente, de preferência um arquivo por personagem ou parte do corpo. Arraste cada camada diretamente na cena.</p>
    </div>
    <div className="hybrid-panel">
      <div className="hybrid-panel-heading"><div className="module-empty-icon"><Move size={20}/></div><div><h2>Camadas e movimento</h2><p>Escolha um movimento por camada: deslizar, dançar ou pular. São movimentos simples de cena, não articulação automática do corpo.</p></div></div>
      {!layers.length ? <div className="empty-state"><ImagePlus size={28}/><h3>Nenhuma camada importada</h3><p>Comece com imagens transparentes separadas para que os elementos possam se mover individualmente.</p></div> : <div style={{ display: 'grid', gap: 10 }}>{layers.map((layer, index) => <div key={layer.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #ecebf3', borderRadius: 10, background: layer.id === selectedId ? '#f5f1ff' : '#fff' }}><button className="secondary-button" onClick={() => setSelectedId(layer.id)}>{index + 1}. {layer.name}</button><label>Nome <input type="text" maxLength={60} style={{ width: 150 }} value={layer.name} onChange={e => updateLayer(layer.id, { name: e.target.value })}/></label><button className="secondary-button" onClick={() => updateLayer(layer.id, { visible: !layer.visible })} aria-label={layer.visible ? "Ocultar camada" : "Mostrar camada"} title={layer.visible ? "Ocultar camada" : "Mostrar camada"}>{layer.visible ? <Eye size={16}/> : <EyeOff size={16}/>} {layer.visible ? "Visível" : "Oculta"}</button><label>X <input type="number" style={{ width: 80 }} value={Math.round(layer.x)} onChange={e => updateLayer(layer.id, { x: Number(e.target.value) })}/></label><label>Y <input type="number" style={{ width: 80 }} value={Math.round(layer.y)} onChange={e => updateLayer(layer.id, { y: Number(e.target.value) })}/></label><label>Largura <input type="number" min="20" max={W} style={{ width: 85 }} value={Math.round(layer.width)} onChange={e => { const width = Math.max(20, Math.min(W, Number(e.target.value) || 20)); updateLayer(layer.id, { width, height: width * layer.image.naturalHeight / layer.image.naturalWidth }) }}/></label><label>Movimento X/s <input type="number" style={{ width: 90 }} value={layer.dx} onChange={e => updateLayer(layer.id, { dx: Number(e.target.value) })}/></label><label>Movimento Y/s <input type="number" style={{ width: 90 }} value={layer.dy} onChange={e => updateLayer(layer.id, { dy: Number(e.target.value) })}/></label><label>Animação <select value={layer.motion} onChange={e => updateLayer(layer.id, { motion: e.target.value as MotionStyle })}><option value="parado">Parado</option><option value="deslizar">Deslizar</option><option value="dançar">Dançar</option><option value="pular">Pular</option></select></label><button className="secondary-button" onClick={() => moveLayer(layer.id, 1)} disabled={index === layers.length - 1} aria-label="Trazer camada para frente" title="Trazer para frente"><ArrowUp size={16}/></button><button className="secondary-button" onClick={() => moveLayer(layer.id, -1)} disabled={index === 0} aria-label="Enviar camada para trás" title="Enviar para trás"><ArrowDown size={16}/></button><button className="secondary-button" onClick={() => duplicateLayer(layer)} aria-label="Duplicar camada" title="Duplicar camada"><Copy size={16}/></button><button className="danger-button" onClick={() => removeLayer(layer.id)} aria-label="Remover camada"><Trash2 size={16}/></button></div>)}</div>}
      {selected && <p style={{ color: '#5b40cc', fontSize: 13 }}>Selecionado: {selected.name}</p>}
      <div className="notice" style={{ marginTop: 14 }}><Info size={16}/> {status}</div>
    </div>
  </section>
}
