import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    mountCartoon3DStudio?: (root: HTMLElement) => {
      preview: () => void
      destroy: () => void
    }
  }
}

export default function AnimationStudio3D() {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let instance: ReturnType<NonNullable<Window['mountCartoon3DStudio']>> | undefined
    let script: HTMLScriptElement | null = null

    const mount = () => {
      if (disposed || !host.current) return
      if (!window.mountCartoon3DStudio) {
        setError('O motor 3D foi carregado, mas não disponibilizou a função de inicialização. Atualize a página e tente novamente.')
        return
      }
      try {
        instance = window.mountCartoon3DStudio(host.current)
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao abrir o estúdio 3D.')
      }
    }

    if (window.mountCartoon3DStudio) {
      mount()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-cartoon-3d-engine]')
      script = existing ?? document.createElement('script')
      const onLoad = () => mount()
      const onError = () => setError('Não foi possível carregar /animation-studio-3d.js. Confira a publicação e a conexão com a internet.')
      script.addEventListener('load', onLoad)
      script.addEventListener('error', onError)
      if (!existing) {
        script.src = '/animation-studio-3d.js'
        script.async = true
        script.dataset.cartoon3dEngine = 'true'
        document.body.appendChild(script)
      } else if (existing.dataset.loaded === 'true') {
        mount()
      }
      return () => {
        disposed = true
        script?.removeEventListener('load', onLoad)
        script?.removeEventListener('error', onError)
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
          <div className="form-kicker">MOVIMENTO DO PERSONAGEM</div>
          <h1>Estúdio de animação 3D</h1>
          <p>Teste movimentos no navegador e exporte um clipe WebM sem chave de API. Esta primeira etapa usa o motor 3D que já existe no projeto.</p>
        </div>
      </div>
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      <div ref={host} />
    </section>
  )
}
