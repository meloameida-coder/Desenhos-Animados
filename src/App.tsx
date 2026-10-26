import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Aperture, ArrowDownRight, ArrowRight, AudioLines, BookOpen, Check, ChevronDown,
  CircleHelp, Clapperboard, Clapperboard as Film, Compass, FileImage,
  FolderKanban, LayoutDashboard, Lightbulb, LogOut, Menu, Music2, Plus, Search, Trash2,
  Settings2, Sparkles, Users, WandSparkles, X, LoaderCircle
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import WorkspaceModule from './components/WorkspaceModule'
import AnimationStudio from './components/AnimationStudio'

type CreativeProject = {
  id: string
  user_id: string
  title: string
  description: string | null
  format: 'series' | 'short' | 'film' | 'music_video' | 'other'
  genre: string | null
  visual_style: string | null
  status: 'idea' | 'in_development' | 'in_production' | 'completed' | 'archived'
  created_at: string
}

const formatLabels: Record<CreativeProject['format'], string> = {
  series: 'Série animada', short: 'Short', film: 'Filme', music_video: 'Clipe musical', other: 'Outro',
}
const statusLabels: Record<CreativeProject['status'], string> = {
  idea: 'Ideia', in_development: 'Em desenvolvimento', in_production: 'Em produção', completed: 'Concluído', archived: 'Arquivado',
}
const navItems = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'projects', label: 'Meus projetos', icon: FolderKanban },
  { id: 'characters', label: 'Personagens', icon: Users },
  { id: 'episodes', label: 'Episódios e roteiros', icon: BookOpen },
  { id: 'scenes', label: 'Cenas e storyboard', icon: Clapperboard },
  { id: 'animation', label: 'Motor de animação', icon: Film },
  { id: 'music', label: 'Músicas e áudio', icon: AudioLines },
  { id: 'library', label: 'Biblioteca de mídia', icon: FileImage },
]
const pageTitles: Record<string, string> = {
  overview: 'Visão geral', projects: 'Meus projetos', characters: 'Personagens',
  episodes: 'Episódios e roteiros', scenes: 'Cenas e storyboard', animation: 'Motor de animação', music: 'Músicas e áudio', library: 'Biblioteca de mídia',
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'update-password'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [projects, setProjects] = useState<CreativeProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [activePage, setActivePage] = useState('overview')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<CreativeProject | null>(null)
  const [savingChanges, setSavingChanges] = useState(false)
  const [contentCounts, setContentCounts] = useState({ characters: 0, episodes: 0, songs: 0 })
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [savingProject, setSavingProject] = useState(false)

  const user = session?.user ?? null

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') { setPasswordRecovery(true); setAuthMode('update-password') }
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadProjects = useCallback(async () => {
    if (!supabase || !user) { setProjects([]); return }
    setProjectsLoading(true)
    setProjectError('')
    const { data, error } = await supabase
      .from('creative_projects')
      .select('id,user_id,title,description,format,genre,visual_style,status,created_at')
      .order('updated_at', { ascending: false })
    if (error) setProjectError('Não foi possível carregar seus projetos. ' + error.message)
    else setProjects((data ?? []) as CreativeProject[])
    setProjectsLoading(false)
  }, [user])

  useEffect(() => { void loadProjects() }, [loadProjects])

  useEffect(() => {
    const refreshCounts = () => {
      if (!supabase || !user) return
      void Promise.all([
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }),
      ]).then(([characters, episodes, songs]) => setContentCounts({
        characters: characters.count ?? 0, episodes: episodes.count ?? 0, songs: songs.count ?? 0,
      }))
    }
    window.addEventListener('creative-content-updated', refreshCounts)
    return () => window.removeEventListener('creative-content-updated', refreshCounts)
  }, [user])


  useEffect(() => {
    let cancelled = false
    async function loadContentCounts() {
      if (!supabase || !user) { setContentCounts({ characters: 0, episodes: 0, songs: 0 }); return }
      const [characters, episodes, songs] = await Promise.all([
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }),
      ])
      if (!cancelled) setContentCounts({ characters: characters.count ?? 0, episodes: episodes.count ?? 0, songs: songs.count ?? 0 })
    }
    void loadContentCounts()
    return () => { cancelled = true }
  }, [user, projects.length])


  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true); setAuthError(''); setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { display_name: displayName.trim() } },
        })
        if (error) throw error
        if (!data.session) setAuthMessage('Cadastro iniciado! Confira seu e-mail para confirmar a conta e depois entre.')
        else setAuthMessage('Conta criada com sucesso!')
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setAuthMessage('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.')
      } else if (authMode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        await supabase.auth.signOut()
        setSession(null); setPasswordRecovery(false); setAuthMode('login'); setPassword('')
        setAuthMessage('Senha atualizada. Entre com sua nova senha.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.')
    } finally { setAuthBusy(false) }
  }

  useEffect(() => {
    setProfileName(String(user?.user_metadata?.display_name ?? ''))
  }, [user?.id, user?.user_metadata?.display_name])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    setSavingProfile(true); setProfileMessage('')
    const { error } = await supabase.auth.updateUser({ data: { display_name: profileName.trim() } })
    setSavingProfile(false)
    if (error) setProfileMessage('Não foi possível atualizar: ' + error.message)
    else setProfileMessage('Nome atualizado com sucesso.')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProjects([])
    setActivePage('overview')
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) return
    setSavingProject(true); setProjectError('')
    const payload = {
      user_id: user.id,
      title,
      description: String(form.get('description') ?? '').trim() || null,
      format: String(form.get('format') ?? 'series'),
      genre: String(form.get('genre') ?? '').trim() || null,
      visual_style: String(form.get('visual_style') ?? '').trim() || null,
      status: 'idea',
    }
    const { error } = await supabase.from('creative_projects').insert(payload)
    setSavingProject(false)
    if (error) { setProjectError('Não foi possível salvar o projeto: ' + error.message); return }
    setShowNewProject(false)
    setActivePage('projects')
    await loadProjects()
  }

  async function updateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user || !editingProject) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) return
    setSavingChanges(true); setProjectError('')
    const { error } = await supabase.from('creative_projects').update({
      title,
      description: String(form.get('description') ?? '').trim() || null,
      format: String(form.get('format') ?? 'series'),
      genre: String(form.get('genre') ?? '').trim() || null,
      visual_style: String(form.get('visual_style') ?? '').trim() || null,
      status: String(form.get('status') ?? 'idea'),
    }).eq('id', editingProject.id).eq('user_id', user.id)
    setSavingChanges(false)
    if (error) { setProjectError('Não foi possível atualizar o projeto: ' + error.message); return }
    setEditingProject(null)
    await loadProjects()
  }

  async function deleteProject(project: CreativeProject) {
    if (!supabase || !user || !window.confirm('Excluir o projeto "' + project.title + '" e todo o conteúdo vinculado? Essa ação não pode ser desfeita.')) return
    setProjectError('')
    const { data: media, error: mediaQueryError } = await supabase.from('media_assets').select('storage_path').eq('project_id', project.id)
    if (mediaQueryError) { setProjectError('Não foi possível preparar a exclusão: ' + mediaQueryError.message); return }
    const paths = (media ?? []).map(item => item.storage_path).filter((path): path is string => Boolean(path))
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('creative-media').remove(paths)
      if (storageError) { setProjectError('Não foi possível remover os arquivos do projeto: ' + storageError.message); return }
    }
    for (const table of ['media_assets', 'generation_jobs', 'scenes', 'songs', 'episodes', 'characters'] as const) {
      const { error } = await supabase.from(table).delete().eq('project_id', project.id).eq('user_id', user.id)
      if (error) { setProjectError('Não foi possível excluir o conteúdo (' + table + '): ' + error.message); return }
    }
    const { error } = await supabase.from('creative_projects').delete().eq('id', project.id).eq('user_id', user.id)
    if (error) { setProjectError('Não foi possível excluir o projeto: ' + error.message); return }
    setEditingProject(null)
    await loadProjects()
    setActivePage('projects')
  }

  const filteredProjects = useMemo(() => projects.filter(project =>
    project.title.toLowerCase().includes(search.toLowerCase()) ||
    (project.genre ?? '').toLowerCase().includes(search.toLowerCase())
  ), [projects, search])
  const greeting = (user?.user_metadata?.display_name as string | undefined)?.trim().split(' ')[0]
    || user?.email?.split('@')[0] || 'criador'

  if (authLoading) return <div className="full-loader"><div className="loader-mark"><Sparkles size={25} /></div><LoaderCircle className="spin" size={22} /><span>Preparando seu estúdio...</span></div>

  if (!isSupabaseConfigured || !supabase) return <SetupScreen />

  if (!session || passwordRecovery) return (
    <div className="auth-layout">
      <section className="auth-art">
        <div className="brand brand-light"><span className="brand-symbol"><Aperture size={23} /></span><span>traço<span className="brand-dot">.</span></span></div>
        <div className="art-copy">
          <span className="eyebrow"><Sparkles size={14} /> SEU ESTÚDIO CRIATIVO</span>
          <h1>Ideias incríveis<br />ganham <span>vida aqui.</span></h1>
          <p>Crie mundos, desenvolva personagens e transforme suas histórias em projetos animados.</p>
          <div className="art-pills"><span><Users size={15} /> Personagens</span><span><BookOpen size={15} /> Histórias</span><span><Music2 size={15} /> Músicas</span></div>
        </div>
        <div className="art-scene" aria-hidden="true">
          <div className="scene-orbit orbit-one"></div><div className="scene-orbit orbit-two"></div>
          <div className="scene-sun"></div><div className="scene-moon"></div>
          <div className="scene-hill hill-back"></div><div className="scene-hill hill-front"></div>
          <div className="scene-star star-one">✦</div><div className="scene-star star-two">✧</div><div className="scene-star star-three">✦</div>
          <div className="scene-character"><div className="character-ear ear-left"></div><div className="character-ear ear-right"></div><div className="character-face"><i></i><i></i><b></b></div></div>
          <div className="scene-card"><span className="tiny-dot"></span> Seu próximo universo começa com uma ideia.</div>
        </div>
        <div className="art-footer"><span>CRIATIVIDADE SEM LIMITES</span><span>01 — 04</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-top"><span>Já faz parte?</span><button className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthMessage(''); setAuthError('') }}>{authMode === 'login' ? 'Criar conta' : 'Entrar'}</button></div>
        <div className="auth-form-wrap">
          <div className="mobile-brand brand"><span className="brand-symbol"><Aperture size={23} /></span><span>traço<span className="brand-dot">.</span></span></div>
          <div className="form-kicker">{authMode === 'reset' ? 'RECUPERE O ACESSO' : authMode === 'update-password' ? 'NOVA SENHA' : authMode === 'signup' ? 'COMECE SUA JORNADA' : 'BEM-VINDO DE VOLTA'}</div>
          <h2>{authMode === 'reset' ? 'Redefina sua senha.' : authMode === 'update-password' ? 'Escolha uma nova senha.' : authMode === 'signup' ? 'Vamos criar juntos.' : 'Entre no seu estúdio.'}</h2>
          <p className="form-subtitle">{authMode === 'reset' ? 'Enviaremos um link para seu e-mail.' : authMode === 'update-password' ? 'Use uma senha nova com pelo menos 6 caracteres.' : authMode === 'signup' ? 'Crie sua conta e dê vida às suas ideias.' : 'Suas ideias e projetos esperam por você.'}</p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'signup' && <label>Como podemos te chamar?<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Seu nome" autoComplete="name" required /></label>}
            {authMode !== 'update-password' && <label>Seu e-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required /></label>}
            {authMode !== 'reset' && <label>{authMode === 'update-password' ? 'Nova senha' : 'Senha'}<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="No mínimo 6 caracteres" minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required /></label>}
            {authMode === 'login' && <div className="forgot-row"><button type="button" className="text-button small" onClick={() => { setAuthMode('reset'); setAuthMessage(''); setAuthError('') }}>Esqueci minha senha</button></div>}
            {authError && <div className="notice error-notice">{authError}</div>}
            {authMessage && <div className="notice success-notice">{authMessage}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? <LoaderCircle size={17} className="spin" /> : null}{authMode === 'reset' ? 'Enviar link' : authMode === 'update-password' ? 'Salvar nova senha' : authMode === 'signup' ? 'Criar minha conta' : 'Entrar no estúdio'} <ArrowRight size={17} /></button>
            {(authMode === 'reset' || authMode === 'update-password') && <button type="button" className="back-login" onClick={() => { setAuthMode('login'); setPasswordRecovery(false); setAuthMessage(''); setAuthError('') }}>Voltar para o login</button>}
          </form>
          <div className="auth-legal"><span>Seus projetos são privados.</span><span>Protegido por autenticação segura.</span></div>
        </div>
      </section>
    </div>
  )

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}
      <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
        <div className="brand sidebar-brand"><span className="brand-symbol"><Aperture size={22} /></span><span>traço<span className="brand-dot">.</span></span><span className="studio-label">STUDIO</span></div>
        <div className="workspace-switch"><div className="workspace-icon"><Sparkles size={17} /></div><div className="workspace-info"><strong>Meu estúdio</strong><span>Plano criativo</span></div><ChevronDown size={15} /></div>
        <div className="nav-caption">ESPAÇO DE CRIAÇÃO</div>
        <nav className="main-nav">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={'nav-item ' + (activePage === item.id ? 'nav-active' : '')} onClick={() => { setActivePage(item.id); setMobileNav(false) }}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'projects' && projects.length > 0 ? <span className="nav-count">{projects.length}</span> : null}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><Lightbulb size={17} /></div><strong>Uma ideia na cabeça?</strong><p>Todo grande universo começa pequeno.</p><button onClick={() => { setShowNewProject(true); setActivePage('projects') }}>Criar projeto <ArrowRight size={14} /></button></div>
          <button className="nav-item settings-item" onClick={() => setActivePage('settings')}><Settings2 size={18} /><span>Configurações</span></button>
          <div className="profile-row"><div className="avatar">{greeting.charAt(0).toUpperCase()}</div><div className="profile-text"><strong>{greeting}</strong><span>{user?.email}</span></div><button className="icon-button logout-button" onClick={signOut} title="Sair da conta" aria-label="Sair da conta"><LogOut size={17} /></button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="breadcrumbs"><span>Estúdio</span><span className="crumb-sep">/</span><strong>{pageTitles[activePage] ?? 'Configurações'}</strong></div><div className="topbar-right"><div className="status-chip"><span></span> Espaço privado</div><div className="top-avatar">{greeting.charAt(0).toUpperCase()}</div></div></header>
        <div className="page-content">
          {activePage === 'overview' ? (
            <>
              <section className="welcome-row"><div><div className="form-kicker">TERÇA-FEIRA CRIATIVA <span className="tiny-spark">✦</span></div><h1>Olá, {greeting} <span className="wave">✳</span></h1><p>Que tal transformar uma ideia em uma história hoje?</p></div><button className="primary-button" onClick={() => setShowNewProject(true)}><Plus size={18} /> Novo projeto</button></section>
              <section className="hero-banner"><div className="hero-content"><span className="hero-tag"><WandSparkles size={14} /> SEU PRÓXIMO UNIVERSO</span><h2>Toda história merece<br />sair do papel<span>.</span></h2><p>Organize suas ideias, crie personagens inesquecíveis e construa seu próprio mundo animado.</p><button className="hero-button" onClick={() => { setActivePage('projects'); if (projects.length === 0) setShowNewProject(true) }}>Explorar meus projetos <ArrowRight size={16} /></button></div><div className="hero-art" aria-hidden="true"><div className="hero-ring ring-a"></div><div className="hero-ring ring-b"></div><div className="hero-planet"></div><div className="hero-planet-small"></div><div className="hero-cloud cloud-a"></div><div className="hero-cloud cloud-b"></div><div className="hero-orbit-dot"></div><span className="hero-spark spark-a">✦</span><span className="hero-spark spark-b">✧</span><div className="floating-note"><Sparkles size={15} /> Ideias em movimento</div></div></section>
              <section className="stats-grid"><StatCard icon={<FolderKanban size={19} />} label="Projetos criados" value={String(projects.length).padStart(2, '0')} note="Seu universo criativo" tone="lavender" /><StatCard icon={<Users size={19} />} label="Personagens" value={String(contentCounts.characters).padStart(2, "0")} note="Dentro dos seus projetos" tone="peach" /><StatCard icon={<BookOpen size={19} />} label="Episódios" value={String(contentCounts.episodes).padStart(2, "0")} note="Histórias em construção" tone="mint" /><StatCard icon={<Music2 size={19} />} label="Músicas" value={String(contentCounts.songs).padStart(2, "0")} note="Trilhas para suas histórias" tone="blue" /></section>
              <section className="section-heading"><div><h2>Projetos recentes</h2><p>Suas ideias mais recentes, todas em um só lugar.</p></div><button className="link-button" onClick={() => setActivePage('projects')}>Ver todos <ArrowRight size={15} /></button></section>
              {projectError && <div className="notice error-notice">{projectError}</div>}
              {projectsLoading ? <div className="inline-loading"><LoaderCircle size={20} className="spin" /> Carregando seus projetos...</div> : projects.length ? <div className="project-grid">{projects.slice(0, 3).map((project, i) => <ProjectCard key={project.id} project={project} index={i} onClick={() => { setEditingProject(project) }} />)}<button className="new-project-card" onClick={() => setShowNewProject(true)}><span className="new-project-icon"><Plus size={22} /></span><strong>Começar uma nova ideia</strong><span>Crie seu próximo projeto criativo</span></button></div> : <EmptyProjects onCreate={() => setShowNewProject(true)} />}
              <section className="bottom-tip"><div className="tip-icon"><Lightbulb size={20} /></div><div><strong>Um pequeno passo já é criação.</strong><p>Comece com uma ideia simples. Você pode desenvolver personagens, episódios e cenas aos poucos.</p></div><ArrowDownRight className="tip-arrow" size={22} /></section>
            </>
          ) : activePage === 'projects' ? (
            <>
              <section className="page-title-row"><div><div className="form-kicker">SEU UNIVERSO CRIATIVO</div><h1>Meus projetos</h1><p>Organize séries, curtas, filmes e clipes em um só lugar.</p></div><button className="primary-button" onClick={() => setShowNewProject(true)}><Plus size={18} /> Novo projeto</button></section>
              <div className="projects-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou gênero..." /></div><span className="result-count">{filteredProjects.length} {filteredProjects.length === 1 ? 'projeto' : 'projetos'}</span></div>
              {projectError && <div className="notice error-notice">{projectError}</div>}
              {projectsLoading ? <div className="inline-loading"><LoaderCircle size={20} className="spin" /> Carregando seus projetos...</div> : filteredProjects.length ? <div className="project-grid all-projects">{filteredProjects.map((project, i) => <ProjectCard key={project.id} project={project} index={i} onClick={() => setEditingProject(project)} />)}<button className="new-project-card" onClick={() => setShowNewProject(true)}><span className="new-project-icon"><Plus size={22} /></span><strong>Nova criação</strong><span>Uma ideia esperando para nascer</span></button></div> : <EmptyProjects onCreate={() => setShowNewProject(true)} filtered={search.length > 0} />}
            </>
          ) : activePage === 'animation' ? (
            <AnimationStudio />
          ) : activePage === 'settings' ? (
            <section className="placeholder-page"><div className="placeholder-icon"><Settings2 size={25} /></div><div className="form-kicker">PREFERÊNCIAS</div><h1>Configurações</h1><p>Gerencie seu perfil e a segurança da conta.</p><form className="settings-panel profile-settings" onSubmit={saveProfile}><div><strong>Seu perfil</strong><span>{session.user.email}</span><label>Nome de exibição<input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Como devemos te chamar?" maxLength={80} /></label>{profileMessage && <span className="settings-feedback">{profileMessage}</span>}</div><button className="primary-button" type="submit" disabled={savingProfile}>{savingProfile ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Salvar perfil</button></form><div className="settings-panel"><div><strong>Conta e segurança</strong><span>Para redefinir sua senha, use “Esqueci minha senha” na tela de entrada.</span></div><button className="secondary-button" onClick={signOut}><LogOut size={16} /> Sair da conta</button></div><div className="settings-panel"><div><strong>Seus dados</strong><span>Projetos e arquivos são salvos na nuvem e separados por conta.</span></div><span className="secure-pill"><Check size={14} /> Proteção ativa</span></div><div className="settings-panel ai-settings-panel"><div><strong>Recursos de IA</strong><span>Assistente de roteiros usa GEMINI_API_KEY; imagens e voz usam OPENAI_API_KEY; música usa ELEVENLABS_API_KEY; vídeo usa MAGE_API_KEY (Mage API). Cadastre as chaves como Secrets das Edge Functions — nunca no frontend. A geração de imagem, música e vídeo pode exigir créditos pagos.</span></div><a className="secondary-button" href="https://supabase.com/dashboard/project/mkbvoltdkhmxsuztbjcd/functions/secrets" target="_blank" rel="noreferrer">Configurar chaves <ArrowRight size={15} /></a></div></section>
          ) : (
            <WorkspaceModule page={activePage as 'characters' | 'episodes' | 'scenes' | 'music' | 'library'} userId={session.user.id} projects={projects.map(project => ({ id: project.id, title: project.title }))} />
          )}
          <footer className="page-footer"><span>traço. studio <span>·</span> Feito para imaginar</span><span><span className="footer-lock">●</span> Seus projetos são privados</span></footer>
        </div>
      </main>
      {editingProject && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditingProject(null) }}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="edit-project-title"><div className="modal-header"><div><span className="form-kicker">EDITAR PROJETO</span><h2 id="edit-project-title">{editingProject.title}</h2><p>Atualize os detalhes e o andamento da sua criação.</p></div><button className="icon-button close-modal" onClick={() => setEditingProject(null)} aria-label="Fechar"><X size={20} /></button></div><form onSubmit={updateProject} className="project-form"><label>Nome do projeto *<input name="title" defaultValue={editingProject.title} required maxLength={120} /></label><label>Formato<select name="format" defaultValue={editingProject.format}><option value="series">Série animada</option><option value="short">Short / vídeo curto</option><option value="film">Filme</option><option value="music_video">Clipe musical</option><option value="other">Outro projeto</option></select></label><label>Gênero ou tema<input name="genre" defaultValue={editingProject.genre ?? ''} maxLength={120} /></label><label>Estilo visual<input name="visual_style" defaultValue={editingProject.visual_style ?? ''} maxLength={120} /></label><label>Andamento<select name="status" defaultValue={editingProject.status}><option value="idea">Ideia</option><option value="in_development">Em desenvolvimento</option><option value="in_production">Em produção</option><option value="completed">Concluído</option><option value="archived">Arquivado</option></select></label><label>Descrição<textarea name="description" defaultValue={editingProject.description ?? ''} rows={3} maxLength={2000} /></label><div className="modal-actions modal-actions-split"><button type="button" className="danger-button" onClick={() => void deleteProject(editingProject)}><Trash2 size={16} /> Excluir projeto</button><div><button type="button" className="secondary-button" onClick={() => setEditingProject(null)}>Cancelar</button><button className="primary-button" type="submit" disabled={savingChanges}>{savingChanges ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />} Salvar alterações</button></div></div></form></section></div>}
      {showNewProject && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowNewProject(false) }}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><div className="modal-header"><div><span className="form-kicker">PRIMEIRO PASSO</span><h2 id="new-project-title">Uma nova ideia</h2><p>Vamos dar forma à sua próxima criação.</p></div><button className="icon-button close-modal" onClick={() => setShowNewProject(false)} aria-label="Fechar"><X size={20} /></button></div><form onSubmit={createProject} className="project-form"><label>Nome do projeto *<input name="title" placeholder="Ex.: As aventuras de Luna" required maxLength={120} autoFocus /></label><label>Formato<select name="format" defaultValue="series"><option value="series">Série animada</option><option value="short">Short / vídeo curto</option><option value="film">Filme</option><option value="music_video">Clipe musical</option><option value="other">Outro projeto</option></select></label><label>Gênero ou tema<input name="genre" placeholder="Ex.: aventura, comédia, fantasia" maxLength={120} /></label><label>Estilo visual<input name="visual_style" placeholder="Ex.: 3D colorido, anime, desenho 2D" maxLength={120} /></label><label>Descrição inicial<textarea name="description" rows={3} placeholder="Qual é a ideia principal dessa história?" maxLength={2000} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewProject(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={savingProject}>{savingProject ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Criar projeto</button></div></form></section></div>}
    </div>
  )
}

function StatCard({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: string; note: string; tone: string }) {
  return <div className="stat-card"><div className={'stat-icon ' + tone}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function ProjectCard({ project, index, onClick }: { project: CreativeProject; index: number; onClick: () => void }) {
  const artClasses = ['project-art lilac-art', 'project-art sunset-art', 'project-art ocean-art', 'project-art forest-art']
  const artIcons = [<Sparkles size={31} />, <Compass size={31} />, <Film size={31} />, <Music2 size={31} />]
  return <button className="project-card" onClick={onClick}><div className={artClasses[index % artClasses.length]}><span className="project-format">{formatLabels[project.format] ?? 'Projeto'}</span><span className="project-art-icon">{artIcons[index % artIcons.length]}</span><span className="art-decoration deco-one">✦</span><span className="art-decoration deco-two">✧</span></div><div className="project-card-body"><div className="project-card-title"><strong>{project.title}</strong><ArrowRight size={16} /></div><p>{project.description || project.genre || 'Uma nova ideia em desenvolvimento.'}</p><div className="project-card-meta"><span className={'status-dot status-' + project.status}></span>{statusLabels[project.status] ?? 'Ideia'}<span className="meta-divider">·</span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</div></div></button>
}

function EmptyProjects({ onCreate, filtered = false }: { onCreate: () => void; filtered?: boolean }) {
  return <div className="empty-state"><div className="empty-art"><div className="empty-orbit"></div><div className="empty-star">✦</div><div className="empty-folder"><FolderKanban size={30} /></div><div className="empty-dot"></div></div><h3>{filtered ? 'Nenhum projeto encontrado' : 'Seu próximo mundo começa aqui'}</h3><p>{filtered ? 'Tente outro nome ou termo de busca.' : 'Ainda não há projetos por aqui. Que tal registrar aquela ideia que não sai da cabeça?'}</p>{!filtered && <button className="primary-button" onClick={onCreate}><Plus size={17} /> Criar primeiro projeto</button>}</div>
}

function SetupScreen() {
  return <div className="setup-screen"><div className="setup-card"><div className="brand"><span className="brand-symbol"><Aperture size={23} /></span><span>traço<span className="brand-dot">.</span></span></div><div className="setup-icon"><Settings2 size={25} /></div><div className="form-kicker">QUASE PRONTO</div><h1>Conecte seu estúdio</h1><p>A interface já está no projeto. Para entrar e salvar seus dados na nuvem, configure as variáveis do Supabase no ambiente de execução.</p><div className="setup-steps"><div><span>1</span><div><strong>Abra o arquivo .env.example</strong><p>Copie para um arquivo chamado <code>.env.local</code>.</p></div></div><div><span>2</span><div><strong>Preencha as duas variáveis</strong><p>Use a URL e a chave pública (publishable key) do projeto Supabase.</p></div></div><div><span>3</span><div><strong>Inicie o aplicativo</strong><p>Execute <code>npm install</code> e depois <code>npm run dev</code>.</p></div></div></div><a className="primary-button setup-link" href="https://supabase.com/dashboard/project/mkbvoltdkhmxsuztbjcd/settings/api" target="_blank" rel="noreferrer">Abrir configurações do Supabase <ArrowRight size={17} /></a><div className="setup-warning"><CircleHelp size={16} /> Nunca coloque a chave service_role no frontend.</div></div></div>
}
