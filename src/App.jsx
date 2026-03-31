import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import ProjectList from './components/ProjectList'
import ProjectDashboard from './components/ProjectDashboard'
import Login from './components/Login'
import './index.css'

function isAdmin(email) {
  if (!email) return false
  return email.endsWith('@misfits.co.jp') || email === 'yuriya02130610@gmail.com'
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [projectId, setProjectId] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

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

  if (user === undefined) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  )

  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ユーザー情報バー */}
      <div className="fixed top-2 right-4 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
        <img src={user.photoURL} className="w-6 h-6 rounded-full" />
        <span className="text-sm text-gray-700">{user.displayName}</span>
        <button onClick={() => signOut(auth)} className="text-xs text-gray-400 hover:text-red-400 ml-1">ログアウト</button>
      </div>

      {projectId ? (
        <ProjectDashboard projectId={projectId} onBack={goHome} user={user} admin={isAdmin(user.email)} />
      ) : (
        <ProjectList onOpen={openProject} user={user} admin={isAdmin(user.email)} />
      )}
    </div>
  )
}
