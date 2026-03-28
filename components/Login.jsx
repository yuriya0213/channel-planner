import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      alert('ログインに失敗しました: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-5xl">📺</div>
        <h1 className="text-2xl font-bold text-gray-800">チャンネルプランナー</h1>
        <p className="text-gray-500 text-sm text-center">Googleアカウントでログインして<br />プロジェクトを管理しましょう</p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3 hover:bg-gray-50 shadow-sm font-medium text-gray-700 w-full justify-center"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          Googleでログイン
        </button>
      </div>
    </div>
  )
}
