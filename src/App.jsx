import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import Toast from './components/ui/Toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import SearchModal from './components/search/SearchModal'
import BottomNav from './components/ui/BottomNav'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import ListPage from './pages/ListPage'
import HistoryPage from './pages/HistoryPage'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const loadingInitialSession = useAuthStore(s => s.loadingInitialSession)
  const session = useAuthStore(s => s.session)

  if (loadingInitialSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <span className="text-gray-400 text-sm">Cargando...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}

function RootRedirect() {
  const loadingInitialSession = useAuthStore(s => s.loadingInitialSession)
  const session = useAuthStore(s => s.session)

  if (loadingInitialSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <span className="text-gray-400 text-sm">Cargando...</span>
      </div>
    )
  }

  return <Navigate to={session ? '/list' : '/login'} replace />
}

function AppRoutes() {
  const setSession = useAuthStore(s => s.setSession)
  const setLoading = useAuthStore(s => s.setLoading)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/list" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      </Routes>
      <SearchModal />
      <BottomNav />
      <Toast />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
