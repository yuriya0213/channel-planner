import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDHZ5H3uCrhVDEU4iwDK3y1TDgDxWhpySA",
  authDomain: "sora-kun-21dff.firebaseapp.com",
  projectId: "sora-kun-21dff",
  storageBucket: "sora-kun-21dff.firebasestorage.app",
  messagingSenderId: "1027071518601",
  appId: "1:1027071518601:web:a23909202349350c746358",
  measurementId: "G-YDYRYNS7CV"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
