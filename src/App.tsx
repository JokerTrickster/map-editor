import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/login/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import EditorPage from './pages/editor/EditorPage'
import ViewerPage from './pages/viewer/ViewerPage'
import { ThemeProvider } from './shared/context/ThemeContext'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  // TODO: Re-enable authentication when OAuth is configured
  // const token = localStorage.getItem('accessToken')
  // if (!token) {
  //   return <Navigate to="/login" replace />
  // }

  // Temporarily bypass authentication for development
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/editor"
            element={
              <PrivateRoute>
                <EditorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/viewer/:projectId"
            element={
              <PrivateRoute>
                <ViewerPage />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
