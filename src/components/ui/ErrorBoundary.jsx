import { Component } from 'react'

// Error boundary global: captura errores de render en el árbol de componentes
// para que un fallo no deje la pantalla en blanco. Muestra un fallback con la
// opción de recargar la app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // En producción esto podría enviarse a un servicio de logging.
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  handleReload = () => {
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
          <div className="max-w-sm space-y-5">
            <span className="text-5xl" role="img" aria-label="Error">
              😵
            </span>
            <h1 className="text-white text-xl font-semibold">Algo salió mal</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ocurrió un error inesperado. Probá recargar la aplicación.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-full transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
