import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Play, Pause, Download, Trash2, Move, Info, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'

type MotionStyle = 'deslizar' | 'dançar' | 'pular'
type BackgroundStyle = 'campo' | 'quarto' | 'palco'
type Layer = { id: string; name: string; image: HTMLImageElement; x: number; y: number; width: number; height: number; dx: number; dy: number; motion: MotionStyle; visible: boolean }
const W = 960
const H = 540

export default function FrameAnimationStudio() {
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

  useEffect(() => { layersRef.current = layers; draw(0) }, [layers, background])
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); recorderRef.current?.stop() }, [])

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
      const active = playingRef.current && elapsed > 0
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
  const selected = layers.find(layer => layer.id === selectedId)

  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">PROTÓTIPO EXPERIMENTAL · SEM CHAMADAS PAGAS DE IA</div><h1>Editor de animação 2D</h1><p>Monte uma cena com camadas separadas, escolha movimentos simples por camada e exporte uma prévia em vídeo.</p></div></div>
    <div className="hybrid-panel" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <label className="primary-button" style={{ cursor: 'pointer' }}><ImagePlus size={17} /> Importar imagens<input type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={e => { void importFiles(e.target.files); e.currentTarget.value = '' }} /></label>
        <button className="secondary-button" onClick={playing ? stopPlayback : startPlayback}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Parar prévia' : 'Reproduzir prévia'}</button>
        <button className="primary-button" onClick={exportVideo} disabled={recording}><Download size={16}/> {recording ? 'Exportando…' : 'Exportar vídeo WEBM'}</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Duração <select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={4}>4 s</option><option value={6}>6 s</option><option value={8}>8 s</option><option value={12}>12 s</option></select></label><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Cenário <select value={background} onChange={e => setBackground(e.target.value as BackgroundStyle)}><option value="campo">Campo</option><option value="quarto">Quarto</option><option value="palco">Palco musical</option></select></label>
      </div>
      <canvas ref={canvasRef} width={W} height={H} onPointerDown={pointerDown} style={{ width: '100%', display: 'block', borderRadius: 12, border: '1px solid #ddd9ee', cursor: playing ? 'default' : 'grab', touchAction: 'none' }} />
      <p style={{ color: '#686579', fontSize: 13, marginBottom: 0 }}>Dica: importe personagens em PNG com fundo transparente, de preferência um arquivo por personagem ou parte do corpo. Arraste cada camada diretamente na cena.</p>
    </div>
    <div className="hybrid-panel">
      <div className="hybrid-panel-heading"><div className="module-empty-icon"><Move size={20}/></div><div><h2>Camadas e movimento</h2><p>Escolha um movimento por camada: deslizar, dançar ou pular. São movimentos simples de cena, não articulação automática do corpo.</p></div></div>
      {!layers.length ? <div className="empty-state"><ImagePlus size={28}/><h3>Nenhuma camada importada</h3><p>Comece com imagens transparentes separadas para que os elementos possam se mover individualmente.</p></div> : <div style={{ display: 'grid', gap: 10 }}>{layers.map((layer, index) => <div key={layer.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #ecebf3', borderRadius: 10, background: layer.id === selectedId ? '#f5f1ff' : '#fff' }}><button className="secondary-button" onClick={() => setSelectedId(layer.id)}>{index + 1}. {layer.name}</button><button className="secondary-button" onClick={() => updateLayer(layer.id, { visible: !layer.visible })} aria-label={layer.visible ? "Ocultar camada" : "Mostrar camada"} title={layer.visible ? "Ocultar camada" : "Mostrar camada"}>{layer.visible ? <Eye size={16}/> : <EyeOff size={16}/>} {layer.visible ? "Visível" : "Oculta"}</button><label>X <input type="number" style={{ width: 80 }} value={Math.round(layer.x)} onChange={e => updateLayer(layer.id, { x: Number(e.target.value) })}/></label><label>Y <input type="number" style={{ width: 80 }} value={Math.round(layer.y)} onChange={e => updateLayer(layer.id, { y: Number(e.target.value) })}/></label><label>Movimento X/s <input type="number" style={{ width: 90 }} value={layer.dx} onChange={e => updateLayer(layer.id, { dx: Number(e.target.value) })}/></label><label>Movimento Y/s <input type="number" style={{ width: 90 }} value={layer.dy} onChange={e => updateLayer(layer.id, { dy: Number(e.target.value) })}/></label><label>Animação <select value={layer.motion} onChange={e => updateLayer(layer.id, { motion: e.target.value as MotionStyle })}><option value="deslizar">Deslizar</option><option value="dançar">Dançar</option><option value="pular">Pular</option></select></label><button className="secondary-button" onClick={() => moveLayer(layer.id, 1)} disabled={index === layers.length - 1} aria-label="Trazer camada para frente" title="Trazer para frente"><ArrowUp size={16}/></button><button className="secondary-button" onClick={() => moveLayer(layer.id, -1)} disabled={index === 0} aria-label="Enviar camada para trás" title="Enviar para trás"><ArrowDown size={16}/></button><button className="danger-button" onClick={() => removeLayer(layer.id)} aria-label="Remover camada"><Trash2 size={16}/></button></div>)}</div>}
      {selected && <p style={{ color: '#5b40cc', fontSize: 13 }}>Selecionado: {selected.name}</p>}
      <div className="notice" style={{ marginTop: 14 }}><Info size={16}/> {status}</div>
    </div>
  </section>
}
