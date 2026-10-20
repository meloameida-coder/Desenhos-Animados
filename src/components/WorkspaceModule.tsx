import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileImage, LoaderCircle, Plus, Trash2, Users, BookOpen, Clapperboard, Music2 } from 'lucide-react'
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
    const { error: insertError } = await supabase.from(config.table).insert(payload)
    setSaving(false)
    if (insertError) { setError('Não foi possível salvar: ' + insertError.message); return }
    setShowForm(false)
    await loadRows()
  }

  async function deleteItem(id: string) {
    if (!supabase || !config || !window.confirm('Excluir este item? Essa ação não pode ser desfeita.')) return
    const { error: deleteError } = await supabase.from(config.table).delete().eq('id', id)
    if (deleteError) setError('Não foi possível excluir: ' + deleteError.message)
    else await loadRows()
  }

  if (page === 'library') {
    if (!config) return null

  return <section className="workspace-page"><div className="page-title-row"><div><div className="form-kicker">SEUS ARQUIVOS</div><h1>Biblioteca de mídia</h1><p>Imagens, áudios, vídeos e referências do seu estúdio.</p></div></div><div className="module-empty"><div className="module-empty-icon"><FileImage size={25} /></div><h2>Biblioteca pronta para receber seus arquivos</h2><p>O banco já guarda os registros de mídia. O envio e armazenamento de arquivos será ativado depois de configurar o Storage e as permissões de upload.</p><div className="module-note">Nenhum arquivo foi enviado ainda.</div></div></section>
  }

  return <section className="workspace-page">
    <div className="page-title-row"><div><div className="form-kicker">SEU UNIVERSO CRIATIVO</div><h1>{config.title}</h1><p>{config.subtitle}</p></div><button className="primary-button" onClick={() => setShowForm(true)} disabled={projects.length === 0}><Plus size={18} /> Novo {config.singular}</button></div>
    {projects.length === 0 && <div className="notice info-notice">Crie primeiro um projeto em “Meus projetos” para adicionar {config.singular === 'episódio' ? 'episódios' : config.singular === 'música' ? 'músicas' : config.singular === 'cena' ? 'cenas' : 'personagens'}.</div>}
    <div className="module-toolbar"><label>Projeto<select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}><option value="all">Todos os projetos</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><span>{rows.length} {rows.length === 1 ? 'registro' : 'registros'}</span></div>
    {error && <div className="notice error-notice">{error}</div>}
    {loading ? <div className="inline-loading"><LoaderCircle size={20} className="spin" /> Carregando...</div> : rows.length ? <div className="module-list">{rows.map(row => <article className="module-row" key={row.id}><div className="module-row-icon"><Icon size={19} /></div><div className="module-row-copy"><strong>{config.display(row)}</strong><p>{config.description(row)}</p><span>{projectNames.get(String(row.project_id)) || 'Projeto'} · {row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : ''}{row.status ? ' · ' + String(row.status) : ''}</span></div><button className="icon-button module-delete" onClick={() => void deleteItem(row.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button></article>)}</div> : <div className="module-empty"><div className="module-empty-icon"><Icon size={25} /></div><h2>Nenhum {config.singular} por aqui ainda</h2><p>Adicione o primeiro registro e comece a organizar essa parte da sua criação.</p><button className="primary-button" onClick={() => setShowForm(true)} disabled={projects.length === 0}><Plus size={17} /> Criar {config.singular}</button></div>}
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="module-form-title"><div className="modal-header"><div><span className="form-kicker">ADICIONAR AO ESTÚDIO</span><h2 id="module-form-title">Novo {config.singular}</h2><p>Os dados serão salvos na nuvem neste projeto.</p></div><button className="icon-button close-modal" onClick={() => setShowForm(false)} aria-label="Fechar">×</button></div><form className="project-form" onSubmit={createItem}><label>Projeto *<select name="project_id" defaultValue={selectedProject === 'all' ? '' : selectedProject} required><option value="" disabled>Escolha um projeto</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>{config.fields.map(field => <label key={field.name}>{field.label}{'required' in field && field.required ? ' *' : ''}{'multiline' in field && field.multiline ? <textarea name={field.name} rows={3} placeholder={field.placeholder} required={'required' in field && Boolean(field.required)} /> : <input name={field.name} type={'type' in field && field.type ? field.type : 'text'} placeholder={field.placeholder} required={'required' in field && Boolean(field.required)} min={field.name === 'episode_number' || field.name === 'scene_number' ? 1 : undefined} />}</label>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Salvar</button></div></form></section></div>}
  </section>
}
