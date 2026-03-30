import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCg8KgujNZUaSeekbUTQBNJbaTCDWH8sWI",
  authDomain: "running-8a8d5.firebaseapp.com",
  projectId: "running-8a8d5",
  storageBucket: "running-8a8d5.firebasestorage.app",
  messagingSenderId: "401592728511",
  appId: "1:401592728511:web:ef41e9307781c32aa2bf0a",
  measurementId: "G-C700ZKVCW2"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
