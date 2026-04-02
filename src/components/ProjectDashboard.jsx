import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import CalendarView from './CalendarView'
import TodoView from './TodoView'
import MembersPanel from './MembersPanel'

export default function ProjectDashboard({ projectId, onBack, user }) {
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('calendar')
  const [showMembers, setShowMembers] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    return onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() })
    })
  }, [projectId])

  const copyUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}#${projectId}`
    navigator.clipboard.writeText(url)
    alert('URLをコピーしました！\n' + url)
  }

  const inviteUser = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    await updateDoc(doc(db, 'projects', projectId), {
      allowedEmails: arrayUnion(inviteEmail.trim().toLowerCase())
    })
    setInviteEmail('')
    alert(`${inviteEmail} を招待しました！`)
  }

  const removeUser = async (email) => {
    if (email === project.ownerEmail) return alert('作成者は削除できません')
    if (!confirm(`${email} を削除しますか？`)) return
    await updateDoc(doc(db, 'projects', projectId), {
      allowedEmails: arrayRemove(email)
    })
  }

  const isOwner = !project?.ownerEmail || project?.ownerEmail === user.email

  if (!project) return <div className="p-10 text-center text-gray-400">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
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
          {isOwner && (
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              ✉️ 招待
            </button>
          )}
          <button
            onClick={copyUrl}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔗 URLをコピー
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        <div className="flex-1 min-w-0">
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

        {showMembers && (
          <div className="w-64 flex-shrink-0">
            <MembersPanel projectId={projectId} />
          </div>
        )}
      </div>

      {/* 招待モーダル */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">メンバーを招待</h2>
            <form onSubmit={inviteUser} className="flex gap-2 mb-4">
              <input
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Googleメールアドレス"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                autoFocus
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">招待</button>
            </form>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">現在のメンバー</p>
              <ul className="space-y-1">
                {project.allowedEmails?.map(email => (
                  <li key={email} className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-700">{email}</span>
                    <div className="flex items-center gap-1">
                      {email === project.ownerEmail && <span className="text-xs text-blue-500">作成者</span>}
                      {isOwner && email !== project.ownerEmail && (
                        <button onClick={() => removeUser(email)} className="text-gray-300 hover:text-red-400 text-xs ml-2">✕</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
