// Firebase SDK のインポート
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase 設定情報（Firebase Consoleからコピー）
const firebaseConfig = {
    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",
    authDomain: "open-hinata3.firebaseapp.com",
    projectId: "open-hinata3",
    storageBucket: "open-hinata3.firebasestorage.app",
    messagingSenderId: "531336516229",
    appId: "1:531336516229:web:1f41b71722d28ee51f4fec",
    measurementId: "G-9WVN4ESGR2"
};

// Firebase アプリの初期化
const app = initializeApp(firebaseConfig);

// Firebase 各機能のインスタンス作成
const auth = getAuth(app); // 認証
const db = getFirestore(app); // Firestore データベース
const storage = getStorage(app); // Cloud Storage

// ログイン状態をブラウザに保存（リロードしても保持）
setPersistence(auth, browserLocalPersistence);


// 他のファイルで利用できるようにエクスポート
export { auth, db, storage };
