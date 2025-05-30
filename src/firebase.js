import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore'; // Firestoreをインポート

const firebaseConfig = {
    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",
    authDomain: "open-hinata3.firebaseapp.com",
    projectId: "open-hinata3",
    storageBucket: "open-hinata3.firebasestorage.app",
    messagingSenderId: "531336516229",
    appId: "1:531336516229:web:1f41b71722d28ee51f4fec",
    measurementId: "G-9WVN4ESGR2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore(); // Firestore用に変更

export async function signIn(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        const response = await fetch("/create-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken })
        });
        if (response.ok) {
            console.log("セッションOK");
        } else {
            console.error("セッション作成エラー");
        }
    } catch (error) {
        console.error("ログインエラー:", error.message);
        throw error;
    }
}

export default firebase;

// // firebase.js (Firebase v8 用)
// import firebase from 'firebase/app'
// import 'firebase/auth'
// import 'firebase/firestore' // ← Firestore を使うならこれが必須！
//
// const firebaseConfig = {
//     apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",
//     authDomain: "open-hinata3.firebaseapp.com",
//     projectId: "open-hinata3",
//     storageBucket: "open-hinata3.firebasestorage.app", // ここを修正
//     messagingSenderId: "531336516229",
//     appId: "1:531336516229:web:1f41b71722d28ee51f4fec",
//     measurementId: "G-9WVN4ESGR2"
// }
//
// // 初期化（すでに初期化されている場合はスキップ）
// if (!firebase.apps.length) {
//     firebase.initializeApp(firebaseConfig)
// }
//
// // Firebase モジュールのエクスポート
// export const auth = firebase.auth()
// export const db = firebase.firestore() // ← これを Dialog-menu 側で使う！
//
// // ログイン関数
// export async function signIn(email, password) {
//     const userCredential = await auth.signInWithEmailAndPassword(email, password)
//     const idToken = await userCredential.user.getIdToken()
//
//     const response = await fetch("/create-session", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ idToken })
//     })
//
//     if (response.ok) {
//         console.log("セッションOK")
//     } else {
//         console.error("セッション作成エラー")
//     }
// }
//
// export default firebase
