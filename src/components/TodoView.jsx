import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'

export default function TodoView({ projectId }) {
  const [todos, setTodos] = useState([])
  const [members, setMembers] = useState([])
  const [filterMember, setFilterMember] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', memberId: '', dueDate: '' })

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'todos'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [projectId])

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'members'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [projectId])

  const addTodo = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addDoc(collection(db, 'projects', projectId, 'todos'), {
      title: form.title.trim(), memberId: form.memberId || null,
      dueDate: form.dueDate || null, done: false, createdAt: serverTimestamp(),
    })
    setForm({ title: '', memberId: '', dueDate: '' }); setShowForm(false)
  }

  const toggleDone = async (id, done) => await updateDoc(doc(db, 'projects', projectId, 'todos', id), { done: !done })
  const deleteTodo = async (id) => await deleteDoc(doc(db, 'projects', projectId, 'todos', id))
  const getMemberName = (id) => members.find(m => m.id === id)?.name || '未割当'

  const filtered = filterMember === 'all' ? todos
    : filterMember === 'unassigned' ? todos.filter(t => !t.memberId)
    : todos.filter(t => t.memberId === filterMember)
  const pending = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'unassigned', ...members.map(m => m.id)].map(id => {
          const label = id === 'all' ? '全員' : id === 'unassigned' ? '未割当' : `👤 ${getMemberName(id)}`
          return (
            <button key={id} onClick={() => setFilterMember(id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${filterMember === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {label}
            </button>
          )
        })}
        <button onClick={() => setShowForm(true)} className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700">＋ タスク追加</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">未完了 <span className="text-blue-500">{pending.length}</span></h3>
        </div>
        {pending.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">タスクなし 🎉</p> : (
          <ul className="divide-y divide-gray-50">
            {pending.map(todo => <TodoItem key={todo.id} todo={todo} memberName={getMemberName(todo.memberId)} onToggle={() => toggleDone(todo.id, todo.done)} onDelete={() => deleteTodo(todo.id)} />)}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-70">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-500">完了済み {done.length}</h3>
          </div>
          <ul className="divide-y divide-gray-50">
            {done.map(todo => <TodoItem key={todo.id} todo={todo} memberName={getMemberName(todo.memberId)} onToggle={() => toggleDone(todo.id, todo.done)} onDelete={() => deleteTodo(todo.id)} />)}
          </ul>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={addTodo} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">タスクを追加</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="タスクのタイトル" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            <select className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}>
              <option value="">担当者（未割当）</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">追加</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function TodoItem({ todo, memberName, onToggle, onDelete }) {
  const isOverdue = !todo.done && todo.dueDate && todo.dueDate < new Date().toISOString().slice(0, 10)
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <button onClick={onToggle} className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-400'}`}>{todo.done && '✓'}</button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{todo.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {todo.memberId && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">👤 {memberName}</span>}
          {todo.dueDate && <span className={`text-xs px-1.5 py-0.5 rounded ${isOverdue ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-100'}`}>{isOverdue ? '⚠️ ' : '📅 '}{todo.dueDate}</span>}
        </div>
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 flex-shrink-0">✕</button>
    </li>
  )
}
