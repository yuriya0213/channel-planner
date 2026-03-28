import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import CalendarView from './CalendarView'
import TodoView from './TodoView'
import MembersPanel from './MembersPanel'

export default function ProjectDashboard({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('calendar')
  const [showMembers, setShowMembers] = useState(false)

  useEffect(() => {
    return onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() })
    })
  }, [projectId])

  // URLをコピーする
  const copyUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}#${projectId}`
    navigator.clipboard.writeText(url)
    alert('URLをコピーしました！\n' + url)
  }

  if (!project) return <div className="p-10 text-center text-gray-400">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-lg">← 戻る</button>
          <div className={`w-8 h-8 rounded-lg ${project.color || 'bg-blue-400'} flex items-center justify-center text-white font-bold`}>
            {project.name[0]}
          </div>
          <h1 className="font-bold text-gray-800 text-xl flex-1">{project.name}</h1>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            👥 メンバー
          </button>
          <button
            onClick={copyUrl}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔗 URLをコピー
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        {/* メインコンテンツ */}
        <div className="flex-1 min-w-0">
          {/* タブ */}
          <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              📅 カレンダー
            </button>
            <button
              onClick={() => setTab('todo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'todo' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ✅ ToDo
            </button>
          </div>

          {tab === 'calendar' && <CalendarView projectId={projectId} />}
          {tab === 'todo' && <TodoView projectId={projectId} />}
        </div>

        {/* メンバーパネル (サイドバー) */}
        {showMembers && (
          <div className="w-64 flex-shrink-0">
            <MembersPanel projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  )
}
