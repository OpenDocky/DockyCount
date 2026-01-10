"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp
let auth: Auth
let db: Firestore

function initFirebase() {
    if (typeof window === "undefined") {
        throw new Error("Firebase can only be initialized on the client")
    }

    if (!app) {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
        auth = getAuth(app)
        db = getFirestore(app)
    }

    return { app, auth, db }
}

export { initFirebase }
export type { Auth, Firestore }
