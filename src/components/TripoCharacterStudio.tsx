import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Box, CheckCircle2, CircleAlert, Download, ImagePlus, LoaderCircle, Sparkles, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'

type TaskResult = { taskId: string; status: string; progress: number; modelUrl?: string | null; previewUrl?: string | null; creditsConsumed?: number | null; message?: string | null }
type FunctionReply = { error?: string; suggestion?: string | null; message?: string | null; taskId?: string; status?: string; progress?: number; modelUrl?: string | null; previewUrl?: string | null; creditsConsumed?: number | null; balance?: number | null }

export default function TripoCharacterStudio() {
  const [mode, setMode] = useState<'text' | 'image'>('image')
  const [prompt, setPrompt] = useState('Personagem infantil 3D original chamado Moli, menina alegre com proporções fofas de desenho animado, olhos expressivos, roupas coloridas, corpo inteiro, materiais suaves, iluminação de estúdio, aparência consistente e adequada para uma série infantil.')
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [task, setTask] = useState<TaskResult | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  async function callApi(body: Record<string, unknown>): Promise<FunctionReply> {
    if (!supabase) throw new Error('Supabase não está configurado.')
    const { data, error: invokeError } = await supabase.functions.invoke('tripo-character', { body })
    if (invokeError) throw new Error(data?.error || invokeError.message || 'Não foi possível acessar o gerador 3D.')
    if (data?.error) throw new Error(data.error + (data.suggestion ? ' ' + data.suggestion : ''))
    return data as FunctionReply
  }

  useEffect(() => {
    let cancelled = false
    void callApi({ action: 'balance' }).then(result => { if (!cancelled && typeof result.balance === 'number') setBalance(result.balance) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!task?.taskId || ['success', 'failed', 'cancelled'].includes(task.status)) return
    const timer = window.setTimeout(async () => {
      try {
        const result = await callApi({ action: 'status', taskId: task.taskId })
        setTask({ taskId: result.taskId || task.taskId, status: result.status || 'running', progress: result.progress ?? 0, modelUrl: result.modelUrl, previewUrl: result.previewUrl, creditsConsumed: result.creditsConsumed, message: result.message })
        if (result.status === 'success') {
          setNotice('Modelo 3D concluído! Abra ou baixe o arquivo GLB agora; o link temporário pode expirar em poucos minutos.')
          void callApi({ action: 'balance' }).then(b => { if (typeof b.balance === 'number') setBalance(b.balance) }).catch(() => {})
        } else if (['failed', 'cancelled'].includes(String(result.status))) setError(result.message || 'A geração não foi concluída. Tente outra imagem ou descrição.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao consultar a tarefa.')
      }
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [task])

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    setError(''); setNotice('')
    if (!selected) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)) { setError('Escolha uma imagem PNG, JPG ou WebP.'); return }
    if (selected.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return }
    setFile(selected)
    setImagePreview(URL.createObjectURL(selected))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(''); setNotice(''); setTask(null); setBusy(true)
    try {
      let result: FunctionReply
      if (mode === 'image') {
        if (!file) throw new Error('Escolha a imagem de referência do personagem.')
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagem inválida.'))
          reader.readAsDataURL(file)
        })
        result = await callApi({ mode, imageBase64, imageType: file.type })
      } else {
        result = await callApi({ mode, prompt })
      }
      if (!result.taskId) throw new Error('O Tripo não retornou o identificador da tarefa.')
      setTask({ taskId: result.taskId, status: result.status || 'queued', progress: 0 })
      setNotice('Solicitação enviada ao Tripo. A geração pode levar alguns minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar a geração.')
    } finally { setBusy(false) }
  }

  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">PERSONAGENS EM 3D</div><h1>Estúdio 3D do Tripo</h1><p>Crie modelos 3D por descrição ou use a imagem de referência da Moli para orientar o resultado.</p></div></div>
    <div className="tripo-credit-row"><div className="tripo-credit"><Wallet size={17}/><span>Créditos disponíveis</span><strong>{balance === null ? '—' : balance.toLocaleString('pt-BR')}</strong></div><span className="tripo-credit-note">A geração usa créditos da API Tripo.</span></div>
    <form className="tripo-panel" onSubmit={submit}>
      <div className="tripo-mode-row">
        <button type="button" className={'tripo-mode ' + (mode === 'image' ? 'tripo-mode-active' : '')} onClick={() => { setMode('image'); setError(''); setNotice('') }}><ImagePlus size={18}/> A partir de imagem</button>
        <button type="button" className={'tripo-mode ' + (mode === 'text' ? 'tripo-mode-active' : '')} onClick={() => { setMode('text'); setError(''); setNotice('') }}><Sparkles size={18}/> A partir de texto</button>
      </div>
      {mode === 'image' ? <div className="tripo-image-picker">
        <label className="tripo-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile}/>{imagePreview ? <img src={imagePreview} alt="Prévia da imagem do personagem"/> : <><ImagePlus size={28}/><strong>Escolher imagem do personagem</strong><span>PNG, JPG ou WebP · até 5 MB</span></>}</label>
        <p>Para preservar melhor a identidade da Moli, use uma imagem nítida, com corpo inteiro, fundo simples e sem objetos cobrindo o rosto.</p>
      </div> : <label className="tripo-prompt-label">Descreva o personagem<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} maxLength={1000} placeholder="Ex.: menina infantil 3D, cabelo castanho..." required minLength={10}/><small>{prompt.length}/1000 caracteres</small></label>}
      {error && <div className="notice error-notice"><CircleAlert size={17}/>{error}</div>}
      {notice && <div className="notice success-notice"><CheckCircle2 size={17}/>{notice}</div>}
      <button className="primary-button tripo-submit" type="submit" disabled={busy || (task !== null && !['success','failed','cancelled'].includes(task.status))}>{busy ? <LoaderCircle size={17} className="spin"/> : <Box size={17}/>} {busy ? 'Enviando...' : 'Gerar personagem 3D'}</button>
    </form>
    {task && <section className="tripo-result"><div className="tripo-result-head"><div><div className="form-kicker">TAREFA {task.taskId}</div><h2>{task.status === 'success' ? 'Seu modelo está pronto' : task.status === 'failed' || task.status === 'cancelled' ? 'Geração interrompida' : 'Gerando seu personagem...'}</h2></div>{!['success','failed','cancelled'].includes(task.status) && <LoaderCircle className="spin" size={22}/>}</div>
      {!['success','failed','cancelled'].includes(task.status) && <div className="tripo-progress"><div style={{width: Math.max(5, Math.min(100, task.progress || 5)) + '%'}}/><span>{task.progress || 0}% · {task.status === 'queued' ? 'Na fila' : 'Processando'}</span></div>}
      {task.previewUrl && <img className="tripo-render" src={task.previewUrl} alt="Prévia do modelo 3D gerado"/>}
      {task.status === 'success' && task.modelUrl && <div className="tripo-result-actions"><a className="primary-button" href={task.modelUrl} target="_blank" rel="noreferrer"><Download size={17}/> Abrir / baixar modelo GLB</a>{task.creditsConsumed !== null && task.creditsConsumed !== undefined && <span>Créditos usados nesta tarefa: {task.creditsConsumed.toLocaleString('pt-BR')}</span>}</div>}
      <p>O Tripo cria o modelo 3D; ele não gera automaticamente um episódio ou um vídeo animado final.</p>
    </section>}
    <div className="tripo-tip"><strong>Importante para a Moli</strong><p>Uma única imagem ajuda a criar o volume 3D, mas não garante uma cópia perfeita. Use sempre a mesma imagem de referência e confira o modelo antes de usar em cenas. O link do arquivo é temporário; baixe o GLB assim que terminar.</p></div>
  </section>
}
