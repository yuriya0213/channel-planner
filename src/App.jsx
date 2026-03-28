import { useState, useEffect } from 'react'
import ProjectList from './components/ProjectList'
import ProjectDashboard from './components/ProjectDashboard'
import './index.css'

export default function App() {
  const [projectId, setProjectId] = useState(null)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) setProjectId(hash)

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '')
      setProjectId(h || null)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const openProject = (id) => {
    window.location.hash = id
    setProjectId(id)
  }

  const goHome = () => {
    window.location.hash = ''
    setProjectId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {projectId ? (
        <ProjectDashboard projectId={projectId} onBack={goHome} />
      ) : (
        <ProjectList onOpen={openProject} />
      )}
    </div>
  )
}
