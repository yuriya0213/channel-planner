import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'

export default function MembersPanel({ projectId }) {
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'members'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [projectId])

  const addMember = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addDoc(collection(db, 'projects', projectId, 'members'), { name: name.trim(), createdAt: serverTimestamp() })
    setName('')
  }

  const deleteMember = async (id) => {
    if (!confirm('このメンバーを削除しますか？')) return
    await deleteDoc(doc(db, 'projects', projectId, 'members', id))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-bold text-gray-700 mb-3">👥 メンバー</h3>
      <form onSubmit={addMember} className="flex gap-2 mb-3">
        <input
          className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="名前を追加"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded-lg text-sm hover:bg-blue-700">追加</button>
      </form>
      <ul className="space-y-1">
        {members.map(m => (
          <li key={m.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">👤 {m.name}</span>
            <button onClick={() => deleteMember(m.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
          </li>
        ))}
        {members.length === 0 && <p className="text-xs text-gray-400 text-center py-2">メンバーなし</p>}
      </ul>
    </div>
  )
}
