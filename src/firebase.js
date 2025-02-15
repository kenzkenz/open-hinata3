// Firebase 設定ファイル (firebase.js)
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",
    authDomain: "open-hinata3.firebaseapp.com",
    projectId: "open-hinata3",
    storageBucket: "open-hinata3.firebasestorage.app",
    messagingSenderId: "531336516229",
    appId: "1:531336516229:web:1f41b71722d28ee51f4fec",
    measurementId: "G-9WVN4ESGR2"
};

// Firebase アプリを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firebase Authentication セッションを 1 週間維持
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Firebase セッションがローカルストレージに保存されました");
    })
    .catch((error) => {
        console.error("Firebase Authentication セッション永続化エラー:", error);
    });

// ログイン時にセッションを 1 週間維持
async function signIn(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    // サーバーにIDトークンを送信して、1週間のセッションを作成
    const response = await fetch("/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
    });

    if (response.ok) {
        console.log("1週間のセッションが設定されました");
    } else {
        console.error("セッション作成エラー");
    }
}

export { auth, signIn };

