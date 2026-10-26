import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    mountCartoonAnimationStudio?: (root: HTMLElement) => {
      preview: () => void
      exportVideo: () => Promise<void>
      destroy: () => void
    }
  }
}

export default function AnimationStudio() {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let instance: ReturnType<NonNullable<Window['mountCartoonAnimationStudio']>> | undefined
    const mount = () => {
      if (disposed || !host.current) return
      if (!window.mountCartoonAnimationStudio) {
        setError('O motor de animação não carregou. Atualize a página e tente novamente.')
        return
      }
      try {
        instance = window.mountCartoonAnimationStudio(host.current)
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao abrir o motor de animação.')
      }
    }

    if (window.mountCartoonAnimationStudio) {
      mount()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-cartoon-animation-engine]')
      const script = existing ?? document.createElement('script')
      const onLoad = () => mount()
      const onError = () => setError('Não foi possível carregar public/animation-studio.js.')
      script.addEventListener('load', onLoad)
      script.addEventListener('error', onError)
      if (!existing) {
        script.src = '/animation-studio.js'
        script.async = true
        script.dataset.cartoonAnimationEngine = 'true'
        document.body.appendChild(script)
      }
      return () => {
        disposed = true
        script.removeEventListener('load', onLoad)
        script.removeEventListener('error', onError)
        instance?.destroy()
      }
    }

    return () => {
      disposed = true
      instance?.destroy()
    }
  }, [])

  return (
    <section className="workspace-page">
      <div className="page-title-row">
        <div>
          <div className="form-kicker">PRODUÇÃO DE VÍDEO</div>
          <h1>Motor de animação</h1>
          <p>Crie um personagem 2D, teste movimentos e exporte um clipe sem API paga.</p>
        </div>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <div ref={host} />
    </section>
  )
}
