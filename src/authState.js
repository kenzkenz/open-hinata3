// src/authState.js
import { ref } from "vue"
import firebase from "./firebase" // v8形式で初期化された firebase インスタンスを使う

// ユーザー情報を保存するリアクティブな変数
const user = ref(null)

// 認証状態を監視する関数（v8では auth は firebase.auth()）
firebase.auth().onAuthStateChanged((firebaseUser) => {
    if (firebaseUser) {
        user.value = firebaseUser
        console.log("ログイン状態を維持:", firebaseUser)
    } else {
        user.value = null
        console.log("ログアウトしました")
    }
})

export { user }



// import { ref } from "vue";
// import { auth } from "./firebase";
// import { onAuthStateChanged } from "firebase/auth";
//
// // ユーザー情報を保存するリアクティブな変数
// const user = ref(null);
// // 認証状態を監視する関数
// onAuthStateChanged(auth, (firebaseUser) => {
//     if (firebaseUser) {
//         user.value = firebaseUser; // ユーザー情報をセット
//         console.log("ログイン状態を維持:", firebaseUser);
//     } else {
//         user.value = null; // ログアウト時
//         console.log("ログアウトしました");
//     }
// });
//
// export { user };

