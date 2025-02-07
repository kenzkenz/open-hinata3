import { ref } from "vue";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// ユーザー情報を保存するリアクティブな変数
const user = ref(null);
// 認証状態を監視する関数
onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
        user.value = firebaseUser; // ユーザー情報をセット
        console.log("ログイン状態を維持:", firebaseUser);
    } else {
        user.value = null; // ログアウト時
        console.log("ログアウトしました");
    }
});

export { user };

