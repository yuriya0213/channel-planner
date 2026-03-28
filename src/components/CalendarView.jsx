import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'

const EVENT_TYPES = [
  { value: 'recording', label: '🎬 収録', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'upload', label: '📤 投稿', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'meeting', label: '💬 ミーティング', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'deadline', label: '⏰ 締め切り', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'other', label: '📌 その他', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

function getTypeStyle(type) {
  return EVENT_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-700 border-gray-200'
}

function getTypeLabel(type) {
  return EVENT_TYPES.find(t => t.value === type)?.label || type
}

export default function CalendarView({ projectId }) {
  const [events, setEvents] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState({ title: '', type: 'upload', description: '', date: '' })

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'events'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [projectId])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const today = new Date()

  const eventsOnDate = (dateStr) => events.filter(e => e.date === dateStr)

  const openForm = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setForm({ title: '', type: 'upload', description: '', date: dateStr })
    setShowForm(true)
  }

  const addEvent = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    await addDoc(collection(db, 'projects', projectId, 'events'), {
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim(),
      date: form.date,
      createdAt: serverTimestamp(),
    })
    setShowForm(false)
  }

  const deleteEvent = async (id) => {
    if (!confirm('このイベントを削除しますか？')) return
    await deleteDoc(doc(db, 'projects', projectId, 'events', id))
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div>
      {/* カレンダーヘッダー */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">◀</button>
          <h2 className="font-bold text-gray-800">{year}年 {month + 1}月</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">▶</button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 bg-gray-50">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-gray-100 bg-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsOnDate(dateStr)
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const dow = (firstDayOfWeek + day - 1) % 7

            return (
              <div
                key={day}
                className="min-h-[80px] border-r border-b border-gray-100 p-1 hover:bg-blue-50 cursor-pointer transition"
                onClick={() => openForm(day)}
              >
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                      className={`text-xs px-1 py-0.5 rounded border truncate ${getTypeStyle(ev.type)} cursor-pointer hover:opacity-70`}
                      title={`${ev.title}（クリックで削除）`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-400">+{dayEvents.length - 3}件</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 今月のイベント一覧 */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-700 mb-3">今月のイベント</h3>
        {events.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length === 0 ? (
          <p className="text-sm text-gray-400">今月のイベントなし</p>
        ) : (
          <ul className="space-y-2">
            {events
              .filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
              .map(ev => (
                <li key={ev.id} className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${getTypeStyle(ev.type)}`}>
                    {getTypeLabel(ev.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{ev.date}</span>
                    {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* イベント追加モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={addEvent} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">イベントを追加</h2>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="タイトル"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <select
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="メモ (任意)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
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
