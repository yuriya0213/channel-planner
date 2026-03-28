import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'

const COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400',
  'bg-green-400', 'bg-blue-400', 'bg-purple-400',
  'bg-pink-400', 'bg-teal-400',
]

export default function ProjectList({ onOpen }) {
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const addProject = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addDoc(collection(db, 'projects'), {
      name: name.trim(),
      description: desc.trim(),
      color,
      createdAt: serverTimestamp(),
    })
    setName(''); setDesc(''); setColor(COLORS[0]); setShowForm(false)
  }

  const deleteProject = async (e, id) => {
    e.stopPropagation()
    if (!confirm('このプロジェクトを削除しますか？')) return
    await deleteDoc(doc(db, 'projects', id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📺 チャンネルプランナー</h1>
          <p className="text-gray-500 mt-1">プロジェクト（チャンネル）ごとにカレンダーとToDoを管理</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          ＋ プロジェクト追加
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={addProject} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">新しいプロジェクト</h2>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="チャンネル名 (例: Robloxチャンネル)"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="説明 (任意)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">カラー</p>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">作成</button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📋</p>
          <p>プロジェクトがありません</p>
          <p className="text-sm mt-1">「＋ プロジェクト追加」から作成してください</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md cursor-pointer flex items-center gap-4 transition"
            >
              <div className={`w-12 h-12 rounded-xl ${p.color || 'bg-blue-400'} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-lg">{p.name}</p>
                {p.description && <p className="text-gray-500 text-sm truncate">{p.description}</p>}
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">開く →</span>
                <button
                  onClick={e => deleteProject(e, p.id)}
                  className="text-gray-300 hover:text-red-400 text-lg px-1"
                  title="削除"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
