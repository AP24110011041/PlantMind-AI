import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDocumentsPage = location.pathname.startsWith('/documents')
  const isAssistantPage = location.pathname.startsWith('/assistant')
  const pageTitle = isDocumentsPage ? 'Documents' : isAssistantPage ? 'AI Assistant' : 'Dashboard'
  const pageSubtitle = isDocumentsPage
    ? 'Upload, review, and manage PDF documents for the PlantMind workspace.'
    : isAssistantPage
      ? 'Ask questions across indexed documents with RAG citations.'
      : 'Unified command center for asset intelligence and operations readiness.'

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <Navbar
            pageTitle={pageTitle}
            pageSubtitle={pageSubtitle}
            onMenuToggle={() => setSidebarOpen(true)}
          />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
