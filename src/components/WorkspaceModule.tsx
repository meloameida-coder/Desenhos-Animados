import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileImage, LoaderCircle, Plus, Trash2, Users, BookOpen, Clapperboard, Music2, Pencil, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ProjectOption = { id: string; title: string }
type WorkspacePage = 'characters' | 'episodes' | 'scenes' | 'music' | 'library'
type RowData = { id: string; project_id?: string; created_at?: string; name?: string; title?: string; role?: string; description?: string; personality?: string; appearance?: string; backstory?: string; synopsis?: string; script?: string; episode_number?: number; status?: string; scene_number?: number; action_description?: string; location?: string; image_prompt?: string; video_prompt?: string; purpose?: string; style?: string; lyrics?: string; music_prompt?: string; asset_type?: string; external_url?: string; storage_path?: string; [key: string]: unknown }

const configs = {
  characters: {
    table: 'characters', title: 'Personagens', subtitle: 'Crie personagens consistentes para os seus universos.', singular: 'personagem', icon: Users,
    fields: [
      { name: 'name', label: 'Nome do personagem', placeholder: 'Ex.: Luna', required: true },
      { name: 'role', label: 'Papel na história', placeholder: 'Ex.: protagonista' },
      { name: 'description', label: 'Resumo do personagem', placeholder: 'Quem é esse personagem?', multiline: true },
      { name: 'personality', label: 'Personalidade', placeholder: 'Ex.: curiosa, corajosa, divertida', multiline: true },
      { name: 'appearance', label: 'Aparência visual', placeholder: 'Cores, roupas, traços e detalhes', multiline: true },
      { name: 'backstory', label: 'História de origem', placeholder: 'De onde veio e o que deseja?', multiline: true },
    ],
    display: (row: RowData) => row.name || 'Personagem sem nome',
    description: (row: RowData) => String(row.role || row.description || row.personality || 'Adicione detalhes para definir este personagem.'),
  },
  episodes: {
    table: 'episodes', title: 'Episódios e roteiros', subtitle: 'Organize capítulos, sinopses e roteiros das suas histórias.', singular: 'episódio', icon: BookOpen,
    fields: [
      { name: 'title', label: 'Título do episódio', placeholder: 'Ex.: O mapa misterioso', required: true },
      { name: 'episode_number', label: 'Número do episódio', placeholder: '1', type: 'number' },
      { name: 'synopsis', label: 'Sinopse', placeholder: 'O que acontece neste episódio?', multiline: true },
      { name: 'outline', label: 'Estrutura da história', placeholder: 'Início, desenvolvimento e final', multiline: true },
      { name: 'script', label: 'Roteiro', placeholder: 'Escreva as falas e ações principais...', multiline: true },
    ],
    display: (row: RowData) => row.title || 'Episódio sem título',
    description: (row: RowData) => String(row.synopsis || row.script || 'Ainda sem sinopse.'),
  },
  scenes: {
    table: 'scenes', title: 'Cenas e storyboard', subtitle: 'Planeje ações, cenários e referências para cada cena.', singular: 'cena', icon: Clapperboard,
    fields: [
      { name: 'scene_number', label: 'Número da cena', placeholder: '1', type: 'number' },
      { name: 'title', label: 'Título da cena', placeholder: 'Ex.: A chegada à floresta' },
      { name: 'location', label: 'Local', placeholder: 'Ex.: Floresta encantada' },
      { name: 'action_description', label: 'O que acontece na cena', placeholder: 'Descreva a ação e o que o público vê.', multiline: true, required: true },
      { name: 'image_prompt', label: 'Prompt para imagem', placeholder: 'Descreva a imagem que gostaria de gerar.', multiline: true },
      { name: 'video_prompt', label: 'Prompt para vídeo', placeholder: 'Movimentos, câmera e ritmo da cena.', multiline: true },
    ],
    display: (row: RowData) => row.title || ('Cena ' + (row.scene_number || 1)),
    description: (row: RowData) => String(row.action_description || row.location || 'Adicione a descrição da cena.'),
  },
  music: {
    table: 'songs', title: 'Músicas e áudio', subtitle: 'Guarde letras, estilos musicais e ideias de trilha sonora.', singular: 'música', icon: Music2,
    fields: [
      { name: 'title', label: 'Nome da música', placeholder: 'Ex.: A canção da aventura', required: true },
      { name: 'purpose', label: 'Objetivo na história', placeholder: 'Ex.: abertura, tema de personagem, trilha' },
      { name: 'style', label: 'Estilo musical', placeholder: 'Ex.: pop infantil, orquestral, alegre' },
      { name: 'lyrics', label: 'Letra', placeholder: 'Escreva a letra da música...', multiline: true },
      { name: 'music_prompt', label: 'Descrição para geração musical', placeholder: 'Instrumentos, voz, clima e andamento...', multiline: true },
    ],
    display: (row: RowData) => row.title || 'Música sem título',
    description: (row: RowData) => String(row.purpose || row.style || 'Ainda sem estilo definido.'),
  },
} as const

export default function WorkspaceModule({ page, userId, projects }: { page: WorkspacePage; userId: string; projects: ProjectOption[] }) {
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRow, setEditingRow] = useState<RowData | null>(null)
  const [error, setError] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const config = page === 'library' ? null : configs[page]
  const Icon = config?.icon ?? FileImage

  const loadRows = useCallback(async () => {
    if (!supabase || !config) { setRows([]); setLoading(false); return }
    setLoading(true)
    setError('')
    let query = supabase.from(config.table).select('*').order('created_at', { ascending: false })
    if (selectedProject !== 'all') query = query.eq('project_id', selectedProject)
    const { data, error: queryError } = await query
    if (queryError) setError('Não foi possível carregar os dados: ' + queryError.message)
    else setRows((data ?? []) as RowData[])
    setLoading(false)
  }, [config, selectedProject])

  useEffect(() => { void loadRows() }, [loadRows])

  const projectNames = useMemo(() => new Map(projects.map(project => [project.id, project.title])), [projects])

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !config) return
    const form = new FormData(event.currentTarget)
    const projectId = String(form.get('project_id') || '')
    if (!projectId) { setError('Escolha um projeto antes de salvar.'); return }
    const payload: Record<string, unknown> = { user_id: userId, project_id: projectId }
    for (const field of config.fields) {
      const value = String(form.get(field.name) ?? '').trim()
      if (value) payload[field.name] = field.type === 'number' ? Number(value) : value
    }
    if (page === 'episodes') payload.status = 'draft'
    setSaving(true); setError('')
    const result = editingRow
      ? await supabase.from(config.table).update(payload).eq('id', editingRow.id)
      : await supabase.from(config.table).insert(payload)
    setSaving(false)
    if (result.error) { setError('Não foi possível salvar: ' + result.error.message); return }
    setShowForm(false); setEditingRow(null)
    window.dispatchEvent(new Event('creative-content-updated'))
    await loadRows()
  }

  async function deleteItem(id: string) {
    if (!supabase || !config || !window.confirm('Excluir este item? Essa ação não pode ser desfeita.')) return
    const { error: deleteError } = await supabase.from(config.table).delete().eq('id', id)
    if (deleteError) setError('Não foi possível excluir: ' + deleteError.message)
    else { window.dispatchEvent(new Event('creative-content-updated')); await loadRows() }
  }

  if (page === 'library') return <MediaLibrary userId={userId} projects={projects} />

  if (!config) return null

  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">SEU UNIVERSO CRIATIVO</div><h1>{config.title}</h1><p>{config.subtitle}</p></div><button className="primary-button" onClick={() => setShowForm(true)} disabled={projects.length === 0}><Plus size={18} /> Novo {config.singular}</button></div>
    {projects.length === 0 && <div className="notice info-notice">Crie primeiro um projeto em “Meus projetos” para adicionar {config.singular === 'episódio' ? 'episódios' : config.singular === 'música' ? 'músicas' : config.singular === 'cena' ? 'cenas' : 'personagens'}.</div>}
    <div className="module-toolbar"><label>Projeto<select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}><option value="all">Todos os projetos</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><span>{rows.length} {rows.length === 1 ? 'registro' : 'registros'}</span></div>
    {error && <div className="notice error-notice">{error}</div>}
    {loading ? <div className="inline-loading"><LoaderCircle size={20} className="spin" /> Carregando...</div> : rows.length ? <div className="module-list">{rows.map(row => <article className="module-row" key={row.id}><div className="module-row-icon"><Icon size={19} /></div><div className="module-row-copy"><strong>{config.display(row)}</strong><p>{config.description(row)}</p><span>{projectNames.get(String(row.project_id)) || 'Projeto'} · {row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : ''}{row.status ? ' · ' + String(row.status) : ''}</span></div><button className="icon-button" onClick={() => { setEditingRow(row); setShowForm(true) }} title="Editar" aria-label="Editar"><Pencil size={15} /></button><button className="icon-button module-delete" onClick={() => void deleteItem(row.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button></article>)}</div> : <div className="module-empty"><div className="module-empty-icon"><Icon size={25} /></div><h2>Nenhum {config.singular} por aqui ainda</h2><p>Adicione o primeiro registro e comece a organizar essa parte da sua criação.</p><button className="primary-button" onClick={() => setShowForm(true)} disabled={projects.length === 0}><Plus size={17} /> Criar {config.singular}</button></div>}
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="module-form-title"><div className="modal-header"><div><span className="form-kicker">ADICIONAR AO ESTÚDIO</span><h2 id="module-form-title">{editingRow ? 'Editar ' + config.singular : 'Novo ' + config.singular}</h2><p>Os dados serão salvos na nuvem neste projeto.</p></div><button className="icon-button close-modal" onClick={() => { setShowForm(false); setEditingRow(null) }} aria-label="Fechar">×</button></div><form className="project-form" onSubmit={createItem}><label>Projeto *<select name="project_id" defaultValue={editingRow?.project_id || (selectedProject === 'all' ? '' : selectedProject)} required><option value="" disabled>Escolha um projeto</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>{config.fields.map(field => <label key={field.name}>{field.label}{'required' in field && field.required ? ' *' : ''}{'multiline' in field && field.multiline ? <textarea name={field.name} rows={3} placeholder={field.placeholder} defaultValue={String(editingRow?.[field.name] ?? '')} required={'required' in field && Boolean(field.required)} /> : <input name={field.name} type={'type' in field && field.type ? field.type : 'text'} placeholder={field.placeholder} defaultValue={String(editingRow?.[field.name] ?? '')} required={'required' in field && Boolean(field.required)} min={field.name === 'episode_number' || field.name === 'scene_number' ? 1 : undefined} />}</label>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditingRow(null) }}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin" /> : editingRow ? <Check size={17} /> : <Plus size={17} />} {editingRow ? 'Salvar alterações' : 'Salvar'}</button></div></form></section></div>}
  </section>
}


type MediaAsset = { id: string; project_id: string; user_id: string; title: string | null; asset_type: 'image' | 'audio' | 'video' | 'document' | 'other'; storage_path: string | null; external_url: string | null; mime_type: string | null; created_at: string }

function MediaLibrary({ userId, projects }: { userId: string; projects: ProjectOption[] }) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')

  const loadAssets = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true); setError('')
    let query = supabase.from('media_assets').select('id,project_id,user_id,title,asset_type,storage_path,external_url,mime_type,created_at').order('created_at', { ascending: false })
    if (selectedProject) query = query.eq('project_id', selectedProject)
    const { data, error: queryError } = await query
    if (queryError) setError('Não foi possível carregar os arquivos: ' + queryError.message)
    else setAssets((data ?? []) as MediaAsset[])
    setLoading(false)
  }, [selectedProject])

  useEffect(() => { void loadAssets() }, [loadAssets])

  async function uploadFiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = event.currentTarget
    const values = new FormData(form)
    const projectId = String(values.get('project_id') || '')
    const fileInput = form.elements.namedItem('files') as HTMLInputElement | null
    const files = Array.from(fileInput?.files ?? [])
    if (!projectId) { setError('Escolha o projeto ao qual os arquivos pertencem.'); return }
    if (!files.length) { setError('Escolha pelo menos um arquivo.'); return }
    if (files.some(file => file.size > 50 * 1024 * 1024)) { setError('Cada arquivo precisa ter no máximo 50 MB.'); return }
    setUploading(true); setError(''); setMessage('')
    let failed = false
    for (const file of files) {
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100) || 'arquivo'
      const path = userId + '/' + projectId + '/' + crypto.randomUUID() + '-' + safeName
      const { error: uploadError } = await supabase.storage.from('creative-media').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (uploadError) { setError('Falha ao enviar "' + file.name + '": ' + uploadError.message); failed = true; break }
      const type: MediaAsset['asset_type'] = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : file.type === 'application/pdf' ? 'document' : 'other'
      const { error: insertError } = await supabase.from('media_assets').insert({ user_id: userId, project_id: projectId, asset_type: type, title: file.name, storage_path: path, mime_type: file.type || null, metadata: { size_bytes: file.size } })
      if (insertError) {
        await supabase.storage.from('creative-media').remove([path])
        setError('O arquivo foi enviado, mas não foi possível registrar na biblioteca: ' + insertError.message)
        failed = true
        break
      }
    }
    setUploading(false)
    if (fileInput) fileInput.value = ''
    if (!form.isConnected) return
    if (!failed) setMessage('Envio finalizado. Seus arquivos estão salvos na nuvem.')
    await loadAssets()
  }

  async function openAsset(asset: MediaAsset) {
    if (!supabase) return
    if (asset.external_url) { window.open(asset.external_url, '_blank', 'noopener,noreferrer'); return }
    if (!asset.storage_path) { setError('Este registro não possui um arquivo associado.'); return }
    const { data, error: urlError } = await supabase.storage.from('creative-media').createSignedUrl(asset.storage_path, 300)
    if (urlError) { setError('Não foi possível abrir o arquivo: ' + urlError.message); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function removeAsset(asset: MediaAsset) {
    if (!supabase || !window.confirm('Excluir "' + (asset.title || 'arquivo') + '" da biblioteca?')) return
    setError(''); setMessage('')
    if (asset.storage_path) {
      const { error: storageError } = await supabase.storage.from('creative-media').remove([asset.storage_path])
      if (storageError) { setError('Não foi possível excluir o arquivo: ' + storageError.message); return }
    }
    const { error: deleteError } = await supabase.from('media_assets').delete().eq('id', asset.id)
    if (deleteError) { setError('O arquivo foi removido do armazenamento, mas o registro não pôde ser excluído: ' + deleteError.message); return }
    await loadAssets()
  }

  const visibleAssets = assets.filter(asset => filter === 'all' || asset.asset_type === filter)
  const iconFor = (type: MediaAsset['asset_type']) => type === 'image' ? <FileImage size={19} /> : type === 'audio' ? <Music2 size={19} /> : type === 'video' ? <Clapperboard size={19} /> : <FileImage size={19} />
  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">SEUS ARQUIVOS</div><h1>Biblioteca de mídia</h1><p>Envie e organize referências, imagens, áudios, vídeos e documentos.</p></div></div>
    {projects.length === 0 ? <div className="notice info-notice">Crie um projeto antes de enviar arquivos para a biblioteca.</div> : <form className="media-upload-panel" onSubmit={uploadFiles}><div className="media-upload-heading"><div className="module-empty-icon"><FileImage size={23} /></div><div><strong>Adicionar arquivos</strong><p>Formatos de imagem, áudio, vídeo e PDF · até 50 MB por arquivo.</p></div></div><div className="media-upload-controls"><label>Projeto *<select name="project_id" defaultValue={selectedProject || projects[0].id} required>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label className="file-picker-label">Escolher arquivos *<input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/wav,audio/ogg,video/mp4,video/webm,application/pdf" required /></label><button className="primary-button" type="submit" disabled={uploading}>{uploading ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} {uploading ? 'Enviando...' : 'Enviar arquivos'}</button></div></form>}
    {error && <div className="notice error-notice">{error}</div>}{message && <div className="notice success-notice">{message}</div>}
    <div className="media-filter-row"><label>Projeto<select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}><option value="">Todos os projetos</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Tipo<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os tipos</option><option value="image">Imagens</option><option value="audio">Áudios</option><option value="video">Vídeos</option><option value="document">Documentos</option><option value="other">Outros</option></select></label><span>{visibleAssets.length} {visibleAssets.length === 1 ? 'arquivo' : 'arquivos'}</span></div>
    {loading ? <div className="inline-loading"><LoaderCircle size={20} className="spin" /> Carregando arquivos...</div> : visibleAssets.length ? <div className="module-list">{visibleAssets.map(asset => <article className="module-row" key={asset.id}><div className="module-row-icon">{iconFor(asset.asset_type)}</div><div className="module-row-copy"><strong>{asset.title || 'Arquivo sem nome'}</strong><p>{asset.mime_type || asset.asset_type} · {projects.find(project => project.id === asset.project_id)?.title || 'Projeto'} </p><span>{new Date(asset.created_at).toLocaleDateString('pt-BR')}</span></div><button className="secondary-button media-open" onClick={() => void openAsset(asset)}>Abrir</button><button className="icon-button module-delete" onClick={() => void removeAsset(asset)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button></article>)}</div> : <div className="module-empty"><div className="module-empty-icon"><FileImage size={25} /></div><h2>Nenhum arquivo encontrado</h2><p>Os arquivos que você enviar ficarão guardados na sua conta e poderão ser abertos novamente.</p></div>}
  </section>
}
