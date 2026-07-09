import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import MainLayout from './layouts/MainLayout'
import AIChat from './pages/AIChat'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="assistant" element={<AIChat />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
