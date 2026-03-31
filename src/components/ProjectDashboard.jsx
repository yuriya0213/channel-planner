import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import CalendarView from './CalendarView'
import TodoView from './TodoView'
import MembersPanel from './MembersPanel'

const EVENT_TYPES = [
  { value: 'recording', label: '🎬 収録' },
  { value: 'upload', label: '📤 投稿' },
  { value: 'meeting', label: '💬 ミーティング' },
  { value: 'deadline', label: '⏰ 締め切り' },
  { value: 'other', label: '📌 その他' },
]

const DEFAULT_TEMPLATE = [
  { label: '撮影', type: 'recording', offsetDays: -7 },
  { label: '編集完了', type: 'deadline', offsetDays: -3 },
  { label: 'サムネ確認', type: 'other', offsetDays: -1 },
]

function TemplateSettings({ project, projectId, isOwner }) {
  const template = project?.scheduleTemplate || DEFAULT_TEMPLATE
  const [items, setItems] = useState(template)
  const [saved, setSaved] = useState(false)
  const [newItem, setNewItem] = useState({ label: '', type: 'recording', offsetDays: -7 })

  const save = async () => {
    await updateDoc(doc(db, 'projects', projectId), { scheduleTemplate: items })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))

  const addItem = () => {
    if (!newItem.label.trim()) return
    setItems([...items, { ...newItem, offsetDays: Number(newItem.offsetDays) }])
    setNewItem({ label: '', type: 'recording', offsetDays: -7 })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800 mb-1">📋 逆算テンプレート設定</h3>
      <p className="text-sm text-gray-500 mb-4">投稿日から何日前に何のイベントを作るか設定します。</p>

      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">
              {item.offsetDays > 0 ? `+${item.offsetDays}日後` : `${item.offsetDays}日前`}
            </span>
            <span className="text-sm font-medium text-gray-800 flex-1">{item.label}</span>
            <span className="text-xs text-gray-400">
              {EVENT_TYPES.find(t => t.value === item.type)?.label}
            </span>
            {isOwner && (
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-sm ml-1">✕</button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <>
          <div className="border-t border-gray-100 pt-4 mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">項目を追加</p>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="ラベル（例：台本完成）"
                value={newItem.label}
                onChange={e => setNewItem(n => ({ ...n, label: e.target.value }))}
              />
              <input
                type="number"
                className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="-7"
                value={newItem.offsetDays}
                onChange={e => setNewItem(n => ({ ...n, offsetDays: Number(e.target.value) }))}
              />
              <select
                className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newItem.type}
                onChange={e => setNewItem(n => ({ ...n, type: e.target.value }))}
              >
                {EVENT_TYPES.filter(t => t.value !== 'upload').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={addItem}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                追加
              </button>
            </div>
          </div>

          <button
            onClick={save}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            {saved ? '✅ 保存しました' : '保存する'}
          </button>
        </>
      )}
    </div>
  )
}

export default function ProjectDashboard({ projectId, onBack, user, admin }) {
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

  const isOwner = admin || !project?.ownerEmail || project?.ownerEmail === user.email

  if (!project) return <div className="p-10 text-center text-gray-400">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-3 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-sm font-medium flex-shrink-0 px-1">← 戻る</button>
          <div className={`w-7 h-7 rounded-lg ${project.color || 'bg-blue-400'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {project.name[0]}
          </div>
          <h1 className="font-bold text-gray-800 text-base flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{project.name}</h1>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="メンバー"
            >
              👥
            </button>
            {isOwner && (
              <button
                onClick={() => setShowInvite(true)}
                className="text-xs px-2 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                title="招待"
              >
                ✉️
              </button>
            )}
            <button
              onClick={copyUrl}
              className="text-xs px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title="URLをコピー"
            >
              🔗
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div>
          <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              📅 カレンダー
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ⚙️ 設定
            </button>
          </div>

          {tab === 'calendar' && (
            <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
              <div style={{minWidth:0}}>
                <CalendarView projectId={projectId} project={project} />
              </div>
              <div>
                <TodoView projectId={projectId} />
              </div>
            </div>
          )}
          {tab === 'settings' && <TemplateSettings project={project} projectId={projectId} isOwner={isOwner} />}
        </div>

        {showMembers && (
          <div className="mt-4">
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
