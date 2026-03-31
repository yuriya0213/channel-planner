import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'

const EVENT_TYPES = [
  { value: 'recording', label: '🎬 収録', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'upload', label: '📤 投稿', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'meeting', label: '💬 ミーティング', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'deadline', label: '⏰ 締め切り', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'other', label: '📌 その他', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const DEFAULT_TEMPLATE = [
  { label: '撮影', type: 'recording', offsetDays: -7 },
  { label: '編集完了', type: 'deadline', offsetDays: -3 },
  { label: 'サムネ確認', type: 'other', offsetDays: -1 },
]

function getTypeStyle(type) {
  return EVENT_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-700 border-gray-200'
}

function getTypeLabel(type) {
  return EVENT_TYPES.find(t => t.value === type)?.label || type
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CalendarView({ projectId, project }) {
  const [events, setEvents] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState({ title: '', type: 'upload', description: '', date: '' })
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [dateMenu, setDateMenu] = useState(null) // { date, x, y }
  const [shootingDate, setShootingDate] = useState('')
  const [shootingMemo, setShootingMemo] = useState('')
  const [setName, setSetName] = useState('')
  const [videoCount, setVideoCount] = useState(3)
  const [uploadDates, setUploadDates] = useState(['', '', ''])
  const [videoTitles, setVideoTitles] = useState(['', '', ''])

  const template = project?.scheduleTemplate || DEFAULT_TEMPLATE

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

  const openDateMenu = (e, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const rect = e.currentTarget.getBoundingClientRect()
    setDateMenu({ date: dateStr, x: rect.left, y: rect.bottom })
  }

  const openForm = (dateStr) => {
    setForm({ title: '', type: 'upload', description: '', date: dateStr })
    setDateMenu(null)
    setShowForm(true)
  }

  const openAutoScheduleFromDate = (dateStr) => {
    setShootingDate(dateStr)
    setDateMenu(null)
    setShowAutoSchedule(true)
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

  const toggleDone = async (e, id, current) => {
    e.stopPropagation()
    await updateDoc(doc(db, 'projects', projectId, 'events', id), { done: !current })
  }

  // 本数変更時にuploadDates・videoTitles配列を同期
  const handleVideoCountChange = (count) => {
    const n = Math.max(1, Math.min(12, count))
    setVideoCount(n)
    setUploadDates(prev => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
    setVideoTitles(prev => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  const setLabel = setName ? `（${setName}）` : ''

  // 撮影日ベース・投稿日個別入力のスケジュール生成
  const previewEvents = shootingDate
    ? (() => {
        const evs = [{
          label: `撮影${setLabel}`,
          type: 'recording',
          date: shootingDate,
          description: shootingMemo || (setName ? `セット: ${setName}` : '自動生成'),
        }]
        uploadDates.forEach((ud, i) => {
          if (!ud) return
          const title = videoTitles[i]?.trim()
          const desc = setName ? `セット: ${setName}` : '自動生成'
          evs.push({
            label: title || `投稿 #${i + 1}`,
            type: 'upload',
            date: ud,
            description: desc,
          })
          template
            .filter(t => t.type !== 'recording')
            .forEach(t => {
              evs.push({
                label: title ? `${t.label} - ${title}` : `${t.label} #${i + 1}`,
                type: t.type,
                date: addDays(ud, t.offsetDays),
                description: desc,
              })
            })
        })
        return evs.sort((a, b) => a.date > b.date ? 1 : -1)
      })()
    : []

  const resetAutoSchedule = () => {
    setShowAutoSchedule(false)
    setShootingDate('')
    setShootingMemo('')
    setSetName('')
    setUploadDates(['', '', ''])
    setVideoTitles(['', '', ''])
  }

  const addAutoSchedule = async () => {
    for (const ev of previewEvents) {
      await addDoc(collection(db, 'projects', projectId, 'events'), {
        title: ev.label,
        type: ev.type,
        description: ev.description || '自動生成',
        date: ev.date,
        createdAt: serverTimestamp(),
      })
    }
    const [y, m] = shootingDate.split('-').map(Number)
    setYear(y)
    setMonth(m - 1)
    resetAutoSchedule()
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
      {/* 次のタスクバナー */}
      {(() => {
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        const upcoming = events
          .filter(e => !e.done && e.date >= todayStr)
          .sort((a, b) => a.date > b.date ? 1 : -1)
          .slice(0, 3)
        if (upcoming.length === 0) return null
        const next = upcoming[0]
        const daysLeft = Math.ceil((new Date(next.date) - new Date(todayStr)) / 86400000)
        const urgency = daysLeft === 0 ? 'bg-red-50 border-red-200' : daysLeft <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
        const urgencyText = daysLeft === 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-600' : 'text-blue-600'
        return (
          <div className={`mb-3 rounded-xl border px-4 py-3 ${urgency}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wide text-gray-500">NEXT</span>
              <span className={`text-xs font-bold ${urgencyText}`}>
                {daysLeft === 0 ? '今日！' : daysLeft === 1 ? '明日' : `${daysLeft}日後`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getTypeStyle(next.type)}`}>{getTypeLabel(next.type)}</span>
              <span className="text-sm font-bold text-gray-800">{next.title}</span>
              <span className="text-xs text-gray-400 ml-auto">{next.date}</span>
            </div>
            {upcoming.length > 1 && (
              <div className="mt-2 pt-2 border-t border-current border-opacity-10 space-y-1">
                {upcoming.slice(1).map(ev => {
                  const d = Math.ceil((new Date(ev.date) - new Date(todayStr)) / 86400000)
                  return (
                    <div key={ev.id} className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${getTypeStyle(ev.type)}`}>{getTypeLabel(ev.type)}</span>
                      <span className="text-xs text-gray-600">{ev.title}</span>
                      <span className="text-xs text-gray-400 ml-auto">{d === 0 ? '今日' : `${d}日後`}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

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
            <div key={`empty-${i}`} className="min-h-[90px] border-r border-b border-gray-100 bg-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsOnDate(dateStr)
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const dow = (firstDayOfWeek + day - 1) % 7

            return (
              <div
                key={day}
                className="min-h-[90px] border-r border-b border-gray-100 p-1 hover:bg-blue-50 cursor-pointer transition"
                onClick={e => openDateMenu(e, day)}
              >
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); toggleDone(e, ev.id, ev.done) }}
                      className={`text-xs px-1 py-0.5 rounded border flex items-center gap-1 cursor-pointer group transition ${ev.done ? 'opacity-40 bg-gray-100 border-gray-200 text-gray-400' : getTypeStyle(ev.type)}`}
                      title={ev.title}
                    >
                      <span className="flex-shrink-0">{ev.done ? '✅' : EVENT_TYPES.find(t => t.value === ev.type)?.label.split(' ')[0] || '📌'}</span>
                      <span className={`truncate ${ev.done ? 'line-through' : ''}`}>{ev.title}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-auto"
                      >✕</button>
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
                <li key={ev.id} className={`flex items-start gap-3 ${ev.done ? 'opacity-50' : ''}`}>
                  <button
                    onClick={e => toggleDone(e, ev.id, ev.done)}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${ev.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}
                  >
                    {ev.done && <span style={{fontSize:'10px'}}>✓</span>}
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${getTypeStyle(ev.type)}`}>
                    {getTypeLabel(ev.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${ev.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{ev.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{ev.date}</span>
                    {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* 日付クリックメニュー */}
      {dateMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setDateMenu(null)}>
          <div
            className="absolute bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-44"
            style={{ top: dateMenu.y + 4, left: dateMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">{dateMenu.date}</span>
            </div>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              onClick={() => openForm(dateMenu.date)}
            >
              ➕ イベントを追加
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-100"
              onClick={() => openAutoScheduleFromDate(dateMenu.date)}
            >
              🎬 逆算生成
            </button>
          </div>
        </div>
      )}

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

      {/* 撮影日ベーススケジュール生成モーダル */}
      {showAutoSchedule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">🎬 撮影日ベース生成</h2>
            <p className="text-sm text-gray-500 mb-4">撮影日・本数・投稿頻度を入力すると、スケジュールを一括生成します。</p>

            <div className="mb-4 space-y-4">
              {/* セット名 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">セット名（例: 4月収録・GW特集）</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="4月収録"
                  value={setName}
                  onChange={e => setSetName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* 撮影日・本数・メモ */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">撮影日</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={shootingDate}
                    onChange={e => setShootingDate(e.target.value)}
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-500 mb-1">本数</label>
                  <input
                    type="number"
                    min="1" max="12"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={videoCount}
                    onChange={e => handleVideoCountChange(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">撮影メモ（場所・出演者など）</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例: スタジオA、ゲスト: ○○さん"
                  value={shootingMemo}
                  onChange={e => setShootingMemo(e.target.value)}
                />
              </div>

              {/* 動画ごとのタイトル・投稿日 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">各動画のタイトルと投稿日</label>
                <p className="text-xs text-gray-400 mb-2">撮れなかった動画は投稿日を空白にするとスキップされます</p>
                <div className="space-y-2">
                  {uploadDates.map((ud, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${ud ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                      <span className="text-xs text-indigo-400 font-bold w-6 flex-shrink-0">#{i + 1}</span>
                      <input
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        placeholder={`動画タイトル #${i + 1}`}
                        value={videoTitles[i] || ''}
                        onChange={e => {
                          const next = [...videoTitles]
                          next[i] = e.target.value
                          setVideoTitles(next)
                        }}
                      />
                      <input
                        type="date"
                        className="w-36 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        value={ud}
                        onChange={e => {
                          const next = [...uploadDates]
                          next[i] = e.target.value
                          setUploadDates(next)
                        }}
                      />
                      {!ud && <span className="text-xs text-gray-300 flex-shrink-0">スキップ</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* プレビュー：動画ごとにグループ表示 */}
            {shootingDate && (
              <div className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                  プレビュー（{previewEvents.length}件生成）
                </div>
                {/* 撮影イベント */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getTypeStyle('recording')}`}>🎬 収録</span>
                  <span className="text-sm font-medium text-gray-800">撮影{setLabel}</span>
                  <span className="text-xs text-gray-400 ml-auto">{shootingDate}</span>
                </div>
                {/* 動画ごとグループ */}
                {uploadDates.map((ud, i) => {
                  if (!ud) return (
                    <div key={i} className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                      <span className="text-xs text-gray-300 font-bold w-6">#{i + 1}</span>
                      <span className="text-xs text-gray-300 italic">スキップ（投稿日未入力）</span>
                    </div>
                  )
                  const title = videoTitles[i]?.trim()
                  const milestones = template.filter(t => t.type !== 'recording').map(t => ({
                    label: t.label,
                    type: t.type,
                    date: addDays(ud, t.offsetDays),
                  }))
                  return (
                    <div key={i} className="border-b border-gray-100 last:border-0">
                      <div className="px-3 py-1.5 bg-indigo-50 flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400">#{i + 1}</span>
                        <span className="text-xs font-medium text-indigo-700">{title || `動画 #${i + 1}`}</span>
                      </div>
                      {milestones.map((m, j) => (
                        <div key={j} className="px-3 py-1.5 pl-8 flex items-center gap-2 border-t border-gray-50">
                          <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getTypeStyle(m.type)}`}>{getTypeLabel(m.type)}</span>
                          <span className="text-xs text-gray-600">{title ? `${m.label} - ${title}` : `${m.label} #${i + 1}`}</span>
                          <span className="text-xs text-gray-400 ml-auto">{m.date}</span>
                        </div>
                      ))}
                      <div className="px-3 py-1.5 pl-8 flex items-center gap-2 border-t border-gray-50">
                        <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getTypeStyle('upload')}`}>📤 投稿</span>
                        <span className="text-xs text-gray-600">{title || `投稿 #${i + 1}`}</span>
                        <span className="text-xs text-gray-400 ml-auto">{ud}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetAutoSchedule}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={addAutoSchedule}
                disabled={!shootingDate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                生成する（{previewEvents.length}件）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
