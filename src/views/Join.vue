<template>
  <div class="join-container">
    <div class="card">
      <h1 v-if="loading">読み込み中...</h1>

      <template v-else-if="groupName">
        <h1>グループ「{{ groupName }}」への参加</h1>
        <p>下のフォームにあなたのメールアドレスを入力して参加してください。</p>

        <input
            v-model="emailInput"
            type="email"
            placeholder="あなたのメールアドレス"
            class="input"
            @input="clearError"
        />
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button class="btn" @click="joinGroup" :disabled="loading">✅ 参加する</button>
      </template>

      <h1 v-else>{{ invalidGroupId ? 'URLにグループIDが含まれていません' : 'グループが見つかりませんでした' }}</h1>
    </div>
  </div>
</template>

<script>
import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

// Firebase初期化は通常 main.js などで行うべきですが、今回はコード内に残します。
// 実際のアプリケーションでは、適切な場所で初期化してください。
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",
    authDomain: "open-hinata3.firebaseapp.com",
    projectId: "open-hinata3",
  });
}

export default {
  data() {
    return {
      groupName: "",
      groupId: "",
      emailInput: "", // テンプレートの v-model と一致させる
      loading: true,
      invalidGroupId: false,
      errorMessage: "", // エラーメッセージ表示用
    };
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get("group");

    console.log("🔥 groupParam:", groupParam);

    if (!groupParam) {
      console.warn("❌ URLにグループIDが含まれていません");
      this.invalidGroupId = true;
      this.loading = false;
      return;
    }

    try {
      console.log("🚀 Firestoreでdoc検索開始");
      let doc = await firebase.firestore().collection("groups").doc(groupParam).get();

      if (!doc.exists) {
        console.log("❌ doc検索に失敗、name検索に切り替え");
        const snapshot = await firebase.firestore()
            .collection("groups")
            .where("name", "==", groupParam)
            .limit(1)
            .get();

        if (!snapshot.empty) {
          doc = snapshot.docs[0];
          console.log("✅ name検索で見つかった: ", doc.id);
        } else {
          console.warn("❌ name検索でも見つからず");
          this.loading = false;
          return;
        }
      } else {
        console.log("✅ doc検索で見つかった: ", doc.id);
      }

      this.groupName = doc.data().name;
      this.groupId = doc.id;
    } catch (error) {
      console.error("❌ Firestore取得エラー:", error);
      this.errorMessage = "グループ情報の取得に失敗しました。";
    } finally {
      this.loading = false;
    }
  },
  methods: {
    clearError() {
      this.errorMessage = "";
    },
    async joinGroup() {
      try {
        // ローディング状態を設定
        this.loading = true;
        this.errorMessage = "";

        // 1. メールアドレスの入力チェック
        if (!this.emailInput) {
          this.errorMessage = "メールアドレスを入力してください";
          return;
        }

        // メールアドレスの形式チェック
        if (!/.+@.+\..+/.test(this.emailInput)) {
          this.errorMessage = "正しいメールアドレスを入力してください";
          return;
        }

        // 2. グループIDの存在と型チェック
        if (!this.groupId || typeof this.groupId !== "string") {
          this.errorMessage = "URLにグループIDが含まれていません";
          return;
        }

        // 3. ログイン状態の確認
        const user = firebase.auth().currentUser;
        if (!user) {
          this.errorMessage = "ログインしてください";
          // 必要に応じてログインページへリダイレクト
          // this.$router.push('/login');
          return;
        }

        // 4. ログインユーザーのメールアドレスと入力されたメールアドレスが一致するか確認
        if (user.email !== this.emailInput) {
          this.errorMessage = "ログイン中のメールアドレスと入力されたメールアドレスが一致しません";
          return;
        }

        console.log("✅ 入力されたメール:", this.emailInput);
        console.log("✅ 取得した groupId:", this.groupId);

        // 5. 招待情報の検索と更新をトランザクションで実行
        await firebase.firestore().runTransaction(async (transaction) => {
          const query = firebase.firestore()
              .collection("invitations")
              .where("email", "==", this.emailInput)
              .where("groupId", "==", this.groupId);

          const snapshot = await query.get();
          if (snapshot.empty) {
            throw new Error("招待が見つかりませんでした。招待メールを確認してください。");
          }

          const invitationDoc = snapshot.docs[0];
          const invitationRef = invitationDoc.ref;
          const currentStatus = invitationDoc.data().status;

          console.log("📦 取得したステータス:", currentStatus);

          if (currentStatus !== "joined") {
            transaction.update(invitationRef, { status: "joined" });
            console.log("✅ Firestoreのstatusをjoinedに更新しました");
          } else {
            console.log("ℹ️ すでにjoined状態でしたが、usersにも追加します");
          }

          const userRef = firebase.firestore().collection("users").doc(user.uid);
          transaction.set(
              userRef,
              {
                groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),
              },
              { merge: true }
          );

          const groupRef = firebase.firestore().collection("groups").doc(this.groupId);
          transaction.set(
              groupRef,
              {
                members: firebase.firestore.FieldValue.arrayUnion(user.uid),
              },
              { merge: true }
          );
        });

        // 6. トランザクション成功後の確認
        const userRef = firebase.firestore().collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const groups = userDoc.data().groups || [];
          if (groups.includes(this.groupId)) {
            console.log(`🟢 成功: groupId ${this.groupId} が users/${user.uid} に追加されました`);
          } else {
            console.warn(`🔴 失敗: groupId ${this.groupId} が users/${user.uid} に見つかりません`);
            this.errorMessage = "グループへの参加に失敗しました。もう一度お試しください。";
            return;
          }
        } else {
          console.warn(`⚠️ users/${user.uid} ドキュメントが存在しません`);
          this.errorMessage = "ユーザー情報の取得に失敗しました。";
          return;
        }

        alert("🎉 参加が完了しました！");
      } catch (error) {
        console.error("❌ グループ参加処理でエラーが発生しました:", error);
        this.errorMessage = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.join-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f2f5f9;
  font-family: "Segoe UI", sans-serif;
}

.card {
  background: white;
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 100%;
  max-width: 420px;
}

h1 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 20px;
}

p {
  font-size: 0.95rem;
  margin-bottom: 20px;
  color: #666;
}

.input {
  width: 100%;
  padding: 10px 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  margin-bottom: 16px;
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: #4caf50;
  outline: none;
}

.error-message {
  color: #e53935;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn:hover {
  background: #45a049;
}

.btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
</style>


<!--<template>-->
<!--  <div class="join-container">-->
<!--    <div class="card">-->
<!--      <h1 v-if="loading">読み込み中...</h1>-->

<!--      <template v-else-if="groupName">-->
<!--        <h1>グループ「{{ groupName }}」への参加</h1>-->
<!--        <p>下のフォームにあなたのメールアドレスを入力して参加申請してください。</p>-->

<!--        <input-->
<!--            v-model="email"-->
<!--            type="email"-->
<!--            placeholder="あなたのメールアドレス"-->
<!--            class="input"-->
<!--        />-->
<!--        <button class="btn" @click="joinGroup">✅ 参加する</button>-->
<!--      </template>-->

<!--      <h1 v-else>{{ invalidGroupId ? 'URLにグループIDが含まれていませんよ' : 'グループが見つかりませんでした' }}</h1>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import firebase from "firebase/app";-->
<!--import "firebase/firestore";-->
<!--import "firebase/auth";-->

<!--if (!firebase.apps.length) {-->
<!--  firebase.initializeApp({-->
<!--    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",-->
<!--    authDomain: "open-hinata3.firebaseapp.com",-->
<!--    projectId: "open-hinata3",-->
<!--  });-->
<!--}-->

<!--export default {-->
<!--  data() {-->
<!--    return {-->
<!--      groupName: "",-->
<!--      groupId: "",-->
<!--      emailInput: "",-->
<!--      loading: true,-->
<!--      invalidGroupId: false,-->
<!--    };-->
<!--  },-->
<!--  async mounted() {-->
<!--    const params = new URLSearchParams(window.location.search);-->
<!--    const groupParam = params.get("group");-->

<!--    console.log("🔥 groupParam:", groupParam);-->

<!--    if (!groupParam) {-->
<!--      console.warn("❌ URLにグループIDが含まれていません");-->
<!--      this.invalidGroupId = true;-->
<!--      this.loading = false;-->
<!--      return;-->
<!--    }-->

<!--    try {-->
<!--      console.log("🚀 Firestoreでdoc検索開始");-->
<!--      let doc = await firebase.firestore().collection("groups").doc(groupParam).get();-->

<!--      if (!doc.exists) {-->
<!--        console.log("❌ doc検索に失敗、name検索に切り替え");-->
<!--        const snapshot = await firebase.firestore()-->
<!--            .collection("groups")-->
<!--            .where("name", "==", groupParam)-->
<!--            .limit(1)-->
<!--            .get();-->

<!--        if (!snapshot.empty) {-->
<!--          doc = snapshot.docs[0];-->
<!--          console.log("✅ name検索で見つかった: ", doc.id);-->
<!--        } else {-->
<!--          console.warn("❌ name検索でも見つからず");-->
<!--          this.loading = false;-->
<!--          return;-->
<!--        }-->
<!--      } else {-->
<!--        console.log("✅ doc検索で見つかった: ", doc.id);-->
<!--      }-->

<!--      this.groupName = doc.data().name;-->
<!--      this.groupId = doc.id;-->
<!--    } catch (error) {-->
<!--      console.error("❌ Firestore取得エラー:", error);-->
<!--    } finally {-->
<!--      this.loading = false;-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    async joinGroup() {-->
<!--      try {-->
<!--        if (!this.emailInput) {-->
<!--          alert("メールアドレスを入力してください");-->
<!--          return;-->
<!--        }-->

<!--        if (!this.groupId || typeof this.groupId !== 'string') {-->
<!--          alert("URLにグループIDが含まれていません");-->
<!--          return;-->
<!--        }-->

<!--        const user = firebase.auth().currentUser;-->
<!--        if (!user) {-->
<!--          alert("ログインしてから参加してください！");-->
<!--          return;-->
<!--        }-->

<!--        console.log("✅ 入力されたメール:", this.emailInput);-->
<!--        console.log("✅ 取得した groupId:", this.groupId);-->

<!--        await firebase.firestore().runTransaction(async (transaction) => {-->
<!--          const query = firebase.firestore()-->
<!--              .collection("invitations")-->
<!--              .where("email", "==", this.emailInput)-->
<!--              .where("groupId", "==", this.groupId);-->

<!--          const snapshot = await query.get();-->
<!--          if (snapshot.empty) {-->
<!--            throw new Error("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");-->
<!--          }-->

<!--          const invitationDoc = snapshot.docs[0];-->
<!--          const invitationRef = invitationDoc.ref;-->
<!--          const currentStatus = invitationDoc.data().status;-->

<!--          console.log("📦 取得したステータス:", currentStatus);-->

<!--          if (currentStatus !== "joined") {-->
<!--            transaction.update(invitationRef, { status: "joined" });-->
<!--            console.log("✅ Firestoreのstatusをjoinedに更新しました");-->
<!--          } else {-->
<!--            console.log("ℹ️ すでにjoined状態でしたが、usersにも追加します");-->
<!--          }-->

<!--          const userRef = firebase.firestore().collection("users").doc(user.uid);-->
<!--          transaction.set(-->
<!--              userRef,-->
<!--              {-->
<!--                groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),-->
<!--              },-->
<!--              { merge: true }-->
<!--          );-->

<!--          const groupRef = firebase.firestore().collection("groups").doc(this.groupId);-->
<!--          transaction.set(-->
<!--              groupRef,-->
<!--              {-->
<!--                members: firebase.firestore.FieldValue.arrayUnion(user.uid),-->
<!--              },-->
<!--              { merge: true }-->
<!--          );-->

<!--          // トランザクション内で確認はできないので、ログはトランザクション外で-->
<!--        });-->

<!--        // トランザクション成功後の確認-->
<!--        const userRef = firebase.firestore().collection("users").doc(user.uid);-->
<!--        const userDoc = await userRef.get();-->
<!--        if (userDoc.exists) {-->
<!--          const groups = userDoc.data().groups || [];-->
<!--          if (groups.includes(this.groupId)) {-->
<!--            console.log(`🟢 成功: groupId ${this.groupId} が users/${user.uid} に追加されました`);-->
<!--          } else {-->
<!--            console.warn(`🔴 失敗: groupId ${this.groupId} が users/${user.uid} に見つかりません`);-->
<!--          }-->
<!--        } else {-->
<!--          console.warn(`⚠️ users/${user.uid} ドキュメントが存在しません`);-->
<!--        }-->

<!--        alert("🎉 参加が完了しました！");-->
<!--      } catch (error) {-->
<!--        console.error("❌ グループ参加処理でエラーが発生しました:", error);-->
<!--        alert(`エラーが発生しました: ${error.message}`);-->
<!--      }-->
<!--    }-->
<!--    // async joinGroup() {-->
<!--    //   try {-->
<!--    //     if (!this.email) {-->
<!--    //       alert("メールアドレスを入力してください");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     if (!this.groupId || typeof this.groupId !== 'string') {-->
<!--    //       alert("URLにグループIDが含まれてねー");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const user = firebase.auth().currentUser;-->
<!--    //     if (!user) {-->
<!--    //       alert("ログインしてから参加してください！");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     console.log("✅ 入力されたメール:", this.email);-->
<!--    //     console.log("✅ 取得した groupId:", this.groupId);-->
<!--    //-->
<!--    //     const query = firebase.firestore()-->
<!--    //         .collection("invitations")-->
<!--    //         .where("email", "==", this.email)-->
<!--    //         .where("groupId", "==", this.groupId);-->
<!--    //-->
<!--    //     const snapshot = await query.get();-->
<!--    //-->
<!--    //     if (snapshot.empty) {-->
<!--    //       alert("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");-->
<!--    //       console.warn("⚠️ 該当する招待が見つかりません");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const invitationDoc = snapshot.docs[0];-->
<!--    //     const currentStatus = invitationDoc.data().status;-->
<!--    //-->
<!--    //     console.log("📦 取得したステータス:", currentStatus);-->
<!--    //-->
<!--    //     if (currentStatus !== "joined") {-->
<!--    //       await invitationDoc.ref.update({ status: "joined" });-->
<!--    //       console.log("✅ Firestoreのstatusをjoinedに更新しました");-->
<!--    //     } else {-->
<!--    //       console.log("ℹ️ すでにjoined状態でしたが、usersにも追加します");-->
<!--    //     }-->
<!--    //-->
<!--    //     // ✅ 追加処理とログ（users に groupId を追加）-->
<!--    //     const userRef = firebase.firestore().collection("users").doc(user.uid);-->
<!--    //     await userRef.set({-->
<!--    //       groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),-->
<!--    //     }, { merge: true });-->
<!--    //-->
<!--    //     // ✅ 追加されたか確認のため読み直してログ出力-->
<!--    //     const userDoc = await userRef.get();-->
<!--    //     if (userDoc.exists) {-->
<!--    //       const groups = userDoc.data().groups || [];-->
<!--    //       if (groups.includes(this.groupId)) {-->
<!--    //         console.log(`🟢 成功: groupId ${this.groupId} が users/${user.uid} に追加されました`);-->
<!--    //       } else {-->
<!--    //         console.warn(`🔴 失敗: groupId ${this.groupId} が users/${user.uid} に見つかりません`);-->
<!--    //       }-->
<!--    //     } else {-->
<!--    //       console.warn(`⚠️ users/${user.uid} ドキュメントが存在しません`);-->
<!--    //     }-->
<!--    //-->
<!--    //     alert("🎉 参加が完了しました！");-->
<!--    //   } catch (error) {-->
<!--    //     console.error("❌ エラー発生:", error);-->
<!--    //     alert("エラーが発生しました: " + error.message);-->
<!--    //   }-->
<!--    // }-->

<!--    // async joinGroup() {-->
<!--    //   try {-->
<!--    //     if (!this.email) {-->
<!--    //       alert("メールアドレスを入力してください");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     if (!this.groupId || typeof this.groupId !== 'string') {-->
<!--    //       alert("URLにグループIDが含まれてねー");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const user = firebase.auth().currentUser;-->
<!--    //     if (!user) {-->
<!--    //       alert("ログインしてから参加してください！");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     console.log("✅ 入力されたメール:", this.email);-->
<!--    //     console.log("✅ 取得した groupId:", this.groupId);-->
<!--    //-->
<!--    //     const query = firebase.firestore()-->
<!--    //         .collection("invitations")-->
<!--    //         .where("email", "==", this.email)-->
<!--    //         .where("groupId", "==", this.groupId);-->
<!--    //-->
<!--    //     const snapshot = await query.get();-->
<!--    //-->
<!--    //     if (snapshot.empty) {-->
<!--    //       alert("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");-->
<!--    //       console.warn("⚠️ 該当する招待が見つかりません");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const invitationDoc = snapshot.docs[0];-->
<!--    //     const currentStatus = invitationDoc.data().status;-->
<!--    //-->
<!--    //     console.log("📦 取得したステータス:", currentStatus);-->
<!--    //-->
<!--    //     if (currentStatus !== "joined") {-->
<!--    //       await invitationDoc.ref.update({ status: "joined" });-->
<!--    //       console.log("✅ Firestoreのstatusをjoinedに更新しました");-->
<!--    //     } else {-->
<!--    //       alert("すでに参加済みです！");-->
<!--    //     }-->
<!--    //-->
<!--    //     await firebase.firestore().collection("users").doc(user.uid).set({-->
<!--    //       groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),-->
<!--    //     }, { merge: true });-->
<!--    //-->
<!--    //     console.log("✅ users に groupId を追加しました (UID指定)");-->
<!--    //     alert("🎉 参加が完了しました！");-->
<!--    //   } catch (error) {-->
<!--    //     console.error("❌ エラー発生:", error);-->
<!--    //     alert("エラーが発生しました: " + error.message);-->
<!--    //   }-->
<!--    // },-->
<!--    //-->
<!--    //-->
<!--    //-->
<!--    // async joinGroup() {-->
<!--    //   try {-->
<!--    //     if (!this.email) {-->
<!--    //       alert("メールアドレスを入力してください");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     if (!this.groupId || typeof this.groupId !== 'string') {-->
<!--    //       alert("URLにグループIDが含まれてねー");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const user = firebase.auth().currentUser;-->
<!--    //     if (!user) {-->
<!--    //       alert("ログインしてから参加してください！");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     console.log("✅ 入力されたメール:", this.email);-->
<!--    //     console.log("✅ 取得した groupId:", this.groupId);-->
<!--    //-->
<!--    //     const query = firebase.firestore()-->
<!--    //         .collection("invitations")-->
<!--    //         .where("email", "==", this.email)-->
<!--    //         .where("groupId", "==", this.groupId);-->
<!--    //-->
<!--    //     const snapshot = await query.get();-->
<!--    //-->
<!--    //     if (snapshot.empty) {-->
<!--    //       alert("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");-->
<!--    //       console.warn("⚠️ 該当する招待が見つかりません");-->
<!--    //       return;-->
<!--    //     }-->
<!--    //-->
<!--    //     const invitationDoc = snapshot.docs[0];-->
<!--    //     const currentStatus = invitationDoc.data().status;-->
<!--    //-->
<!--    //     console.log("📦 取得したステータス:", currentStatus);-->
<!--    //-->
<!--    //     if (currentStatus === "joined") {-->
<!--    //       alert("すでに参加済みです！");-->
<!--    //     } else {-->
<!--    //       await invitationDoc.ref.update({ status: "joined" });-->
<!--    //       console.log("✅ Firestoreのstatusをjoinedに更新しました");-->
<!--    //     }-->
<!--    //-->
<!--    //     await firebase.firestore().collection("users").doc(user.uid).update({-->
<!--    //       groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),-->
<!--    //     });-->
<!--    //     console.log("✅ users に groupId を追加しました (UID指定)");-->
<!--    //-->
<!--    //     alert("🎉 参加が完了しました！");-->
<!--    //   } catch (error) {-->
<!--    //     console.error("❌ エラー発生:", error);-->
<!--    //     alert("エラーが発生しました: " + error.message);-->
<!--    //   }-->
<!--    // },-->
<!--  },-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--.join-container {-->
<!--  display: flex;-->
<!--  justify-content: center;-->
<!--  align-items: center;-->
<!--  min-height: 100vh;-->
<!--  background: #f2f5f9;-->
<!--  font-family: "Segoe UI", sans-serif;-->
<!--}-->

<!--.card {-->
<!--  background: white;-->
<!--  padding: 40px 30px;-->
<!--  border-radius: 12px;-->
<!--  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);-->
<!--  text-align: center;-->
<!--  width: 100%;-->
<!--  max-width: 420px;-->
<!--}-->

<!--h1 {-->
<!--  font-size: 1.5rem;-->
<!--  color: #333;-->
<!--  margin-bottom: 20px;-->
<!--}-->

<!--p {-->
<!--  font-size: 0.95rem;-->
<!--  margin-bottom: 20px;-->
<!--  color: #666;-->
<!--}-->

<!--.input {-->
<!--  width: 100%;-->
<!--  padding: 10px 12px;-->
<!--  font-size: 1rem;-->
<!--  border: 1px solid #ccc;-->
<!--  border-radius: 6px;-->
<!--  margin-bottom: 16px;-->
<!--}-->

<!--.btn {-->
<!--  background: #4caf50;-->
<!--  color: white;-->
<!--  border: none;-->
<!--  padding: 10px 20px;-->
<!--  font-size: 1rem;-->
<!--  border-radius: 6px;-->
<!--  cursor: pointer;-->
<!--  transition: 0.2s ease;-->
<!--}-->

<!--.btn:hover {-->
<!--  background: #45a049;-->
<!--}-->
<!--</style>-->



<!--&lt;!&ndash;<template>&ndash;&gt;-->
<!--&lt;!&ndash;  <div class="join-container">&ndash;&gt;-->
<!--&lt;!&ndash;    <div class="card">&ndash;&gt;-->
<!--&lt;!&ndash;      <h1 v-if="loading">読み込み中...</h1>&ndash;&gt;-->

<!--&lt;!&ndash;      <template v-else-if="groupName">&ndash;&gt;-->
<!--&lt;!&ndash;        <h1>グループ「{{ groupName }}」への参加</h1>&ndash;&gt;-->
<!--&lt;!&ndash;        <p>下のフォームにあなたのメールアドレスを入力して参加申請してください。</p>&ndash;&gt;-->

<!--&lt;!&ndash;        <input&ndash;&gt;-->
<!--&lt;!&ndash;            v-model="email"&ndash;&gt;-->
<!--&lt;!&ndash;            type="email"&ndash;&gt;-->
<!--&lt;!&ndash;            placeholder="あなたのメールアドレス"&ndash;&gt;-->
<!--&lt;!&ndash;            class="input"&ndash;&gt;-->
<!--&lt;!&ndash;        />&ndash;&gt;-->
<!--&lt;!&ndash;        <button class="btn" @click="joinGroup">✅ 参加する</button>&ndash;&gt;-->
<!--&lt;!&ndash;      </template>&ndash;&gt;-->

<!--&lt;!&ndash;      <h1 v-else>{{ invalidGroupId ? 'URLにグループIDが含まれていませんよ' : 'グループが見つかりませんでした' }}</h1>&ndash;&gt;-->
<!--&lt;!&ndash;    </div>&ndash;&gt;-->
<!--&lt;!&ndash;  </div>&ndash;&gt;-->
<!--&lt;!&ndash;</template>&ndash;&gt;-->

<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;import firebase from "firebase/app";&ndash;&gt;-->
<!--&lt;!&ndash;import "firebase/firestore";&ndash;&gt;-->

<!--&lt;!&ndash;if (!firebase.apps.length) {&ndash;&gt;-->
<!--&lt;!&ndash;  firebase.initializeApp({&ndash;&gt;-->
<!--&lt;!&ndash;    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",&ndash;&gt;-->
<!--&lt;!&ndash;    authDomain: "open-hinata3.firebaseapp.com",&ndash;&gt;-->
<!--&lt;!&ndash;    projectId: "open-hinata3",&ndash;&gt;-->
<!--&lt;!&ndash;  });&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  data() {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      groupName: "",&ndash;&gt;-->
<!--&lt;!&ndash;      groupId: "",&ndash;&gt;-->
<!--&lt;!&ndash;      email: "",&ndash;&gt;-->
<!--&lt;!&ndash;      loading: true,&ndash;&gt;-->
<!--&lt;!&ndash;      invalidGroupId: false,&ndash;&gt;-->
<!--&lt;!&ndash;    };&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  async mounted() {&ndash;&gt;-->
<!--&lt;!&ndash;    const params = new URLSearchParams(window.location.search);&ndash;&gt;-->
<!--&lt;!&ndash;    const groupParam = params.get("group");&ndash;&gt;-->

<!--&lt;!&ndash;    console.log("🔥 groupParam:", groupParam);&ndash;&gt;-->

<!--&lt;!&ndash;    if (!groupParam) {&ndash;&gt;-->
<!--&lt;!&ndash;      console.warn("❌ URLにグループIDが含まれていません");&ndash;&gt;-->
<!--&lt;!&ndash;      this.invalidGroupId = true;&ndash;&gt;-->
<!--&lt;!&ndash;      this.loading = false;&ndash;&gt;-->
<!--&lt;!&ndash;      return;&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->

<!--&lt;!&ndash;    try {&ndash;&gt;-->
<!--&lt;!&ndash;      console.log("🚀 Firestoreでdoc検索開始");&ndash;&gt;-->
<!--&lt;!&ndash;      let doc = await firebase.firestore().collection("groups").doc(groupParam).get();&ndash;&gt;-->

<!--&lt;!&ndash;      if (!doc.exists) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.log("❌ doc検索に失敗、name検索に切り替え");&ndash;&gt;-->
<!--&lt;!&ndash;        const snapshot = await firebase.firestore()&ndash;&gt;-->
<!--&lt;!&ndash;            .collection("groups")&ndash;&gt;-->
<!--&lt;!&ndash;            .where("name", "==", groupParam)&ndash;&gt;-->
<!--&lt;!&ndash;            .limit(1)&ndash;&gt;-->
<!--&lt;!&ndash;            .get();&ndash;&gt;-->

<!--&lt;!&ndash;        if (!snapshot.empty) {&ndash;&gt;-->
<!--&lt;!&ndash;          doc = snapshot.docs[0];&ndash;&gt;-->
<!--&lt;!&ndash;          console.log("✅ name検索で見つかった: ", doc.id);&ndash;&gt;-->
<!--&lt;!&ndash;        } else {&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn("❌ name検索でも見つからず");&ndash;&gt;-->
<!--&lt;!&ndash;          this.loading = false;&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;      } else {&ndash;&gt;-->
<!--&lt;!&ndash;        console.log("✅ doc検索で見つかった: ", doc.id);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      this.groupName = doc.data().name;&ndash;&gt;-->
<!--&lt;!&ndash;      this.groupId = doc.id;&ndash;&gt;-->
<!--&lt;!&ndash;    } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;      console.error("❌ Firestore取得エラー:", error);&ndash;&gt;-->
<!--&lt;!&ndash;    } finally {&ndash;&gt;-->
<!--&lt;!&ndash;      this.loading = false;&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    async joinGroup() {&ndash;&gt;-->
<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        if (!this.email) {&ndash;&gt;-->
<!--&lt;!&ndash;          alert("メールアドレスを入力してください");&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        if (!this.groupId || typeof this.groupId !== 'string') {&ndash;&gt;-->
<!--&lt;!&ndash;          alert("URLにグループIDが含まれてねー");&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        console.log("✅ 入力されたメール:", this.email);&ndash;&gt;-->
<!--&lt;!&ndash;        console.log("✅ 取得した groupId:", this.groupId);&ndash;&gt;-->

<!--&lt;!&ndash;        const query = firebase.firestore()&ndash;&gt;-->
<!--&lt;!&ndash;            .collection("invitations")&ndash;&gt;-->
<!--&lt;!&ndash;            .where("email", "==", this.email)&ndash;&gt;-->
<!--&lt;!&ndash;            .where("groupId", "==", this.groupId);&ndash;&gt;-->

<!--&lt;!&ndash;        const snapshot = await query.get();&ndash;&gt;-->

<!--&lt;!&ndash;        if (snapshot.empty) {&ndash;&gt;-->
<!--&lt;!&ndash;          alert("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn("⚠️ 該当する招待が見つかりません");&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        const invitationDoc = snapshot.docs[0];&ndash;&gt;-->
<!--&lt;!&ndash;        const currentStatus = invitationDoc.data().status;&ndash;&gt;-->

<!--&lt;!&ndash;        console.log("📦 取得したステータス:", currentStatus);&ndash;&gt;-->

<!--&lt;!&ndash;        if (currentStatus !== "joined") {&ndash;&gt;-->
<!--&lt;!&ndash;          await invitationDoc.ref.update({ status: "joined" });&ndash;&gt;-->
<!--&lt;!&ndash;          console.log("✅ Firestoreのstatusをjoinedに更新しました");&ndash;&gt;-->
<!--&lt;!&ndash;        } else {&ndash;&gt;-->
<!--&lt;!&ndash;          console.log("ℹ️ すでにjoined済みなのでstatus更新はスキップ");&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        // 🔥 users コレクションにも groupId を追加する（常に実行）&ndash;&gt;-->
<!--&lt;!&ndash;        const userSnapshot = await firebase.firestore()&ndash;&gt;-->
<!--&lt;!&ndash;            .collection("users")&ndash;&gt;-->
<!--&lt;!&ndash;            .where("email", "==", this.email)&ndash;&gt;-->
<!--&lt;!&ndash;            .limit(1)&ndash;&gt;-->
<!--&lt;!&ndash;            .get();&ndash;&gt;-->

<!--&lt;!&ndash;        if (!userSnapshot.empty) {&ndash;&gt;-->
<!--&lt;!&ndash;          const userDoc = userSnapshot.docs[0];&ndash;&gt;-->
<!--&lt;!&ndash;          await userDoc.ref.update({&ndash;&gt;-->
<!--&lt;!&ndash;            groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),&ndash;&gt;-->
<!--&lt;!&ndash;          });&ndash;&gt;-->
<!--&lt;!&ndash;          console.log("✅ users に groupId を追加しました");&ndash;&gt;-->
<!--&lt;!&ndash;        } else {&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn("⚠️ 該当する users ドキュメントが見つかりませんでした");&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        alert("🎉 参加が完了しました！");&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error("❌ エラー発生:", error);&ndash;&gt;-->
<!--&lt;!&ndash;        alert("エラーが発生しました: " + error.message);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->

<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;};&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->

<!--&lt;!&ndash;<style scoped>&ndash;&gt;-->
<!--&lt;!&ndash;.join-container {&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  justify-content: center;&ndash;&gt;-->
<!--&lt;!&ndash;  align-items: center;&ndash;&gt;-->
<!--&lt;!&ndash;  min-height: 100vh;&ndash;&gt;-->
<!--&lt;!&ndash;  background: #f2f5f9;&ndash;&gt;-->
<!--&lt;!&ndash;  font-family: "Segoe UI", sans-serif;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.card {&ndash;&gt;-->
<!--&lt;!&ndash;  background: white;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 40px 30px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;  text-align: center;&ndash;&gt;-->
<!--&lt;!&ndash;  width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  max-width: 420px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;h1 {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1.5rem;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #333;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 20px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;p {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 0.95rem;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 20px;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #666;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.input {&ndash;&gt;-->
<!--&lt;!&ndash;  width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 10px 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1rem;&ndash;&gt;-->
<!--&lt;!&ndash;  border: 1px solid #ccc;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 6px;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.btn {&ndash;&gt;-->
<!--&lt;!&ndash;  background: #4caf50;&ndash;&gt;-->
<!--&lt;!&ndash;  color: white;&ndash;&gt;-->
<!--&lt;!&ndash;  border: none;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 10px 20px;&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1rem;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 6px;&ndash;&gt;-->
<!--&lt;!&ndash;  cursor: pointer;&ndash;&gt;-->
<!--&lt;!&ndash;  transition: 0.2s ease;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.btn:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  background: #45a049;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</style>&ndash;&gt;-->



<!--&lt;!&ndash;<template>&ndash;&gt;-->
<!--&lt;!&ndash;  <div class="join-container">&ndash;&gt;-->
<!--&lt;!&ndash;    <div class="card">&ndash;&gt;-->
<!--&lt;!&ndash;      <h1 v-if="loading">読み込み中...</h1>&ndash;&gt;-->

<!--&lt;!&ndash;      <template v-else-if="groupName">&ndash;&gt;-->
<!--&lt;!&ndash;        <h1>グループ「{{ groupName }}」への参加</h1>&ndash;&gt;-->
<!--&lt;!&ndash;        <p>下のフォームにあなたのメールアドレスを入力して参加申請してください。</p>&ndash;&gt;-->

<!--&lt;!&ndash;        <input&ndash;&gt;-->
<!--&lt;!&ndash;            v-model="email"&ndash;&gt;-->
<!--&lt;!&ndash;            type="email"&ndash;&gt;-->
<!--&lt;!&ndash;            placeholder="あなたのメールアドレス"&ndash;&gt;-->
<!--&lt;!&ndash;            class="input"&ndash;&gt;-->
<!--&lt;!&ndash;        />&ndash;&gt;-->
<!--&lt;!&ndash;        <button class="btn" @click="submitJoin">✅ 参加する</button>&ndash;&gt;-->
<!--&lt;!&ndash;      </template>&ndash;&gt;-->

<!--&lt;!&ndash;      <h1 v-else>{{ invalidGroupId ? 'URLにグループIDが含まれていません' : 'グループが見つかりませんでした' }}</h1>&ndash;&gt;-->
<!--&lt;!&ndash;    </div>&ndash;&gt;-->
<!--&lt;!&ndash;  </div>&ndash;&gt;-->
<!--&lt;!&ndash;</template>&ndash;&gt;-->

<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;import firebase from "firebase/app";&ndash;&gt;-->
<!--&lt;!&ndash;import "firebase/firestore";&ndash;&gt;-->

<!--&lt;!&ndash;if (!firebase.apps.length) {&ndash;&gt;-->
<!--&lt;!&ndash;  firebase.initializeApp({&ndash;&gt;-->
<!--&lt;!&ndash;    apiKey: "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY",&ndash;&gt;-->
<!--&lt;!&ndash;    authDomain: "open-hinata3.firebaseapp.com",&ndash;&gt;-->
<!--&lt;!&ndash;    projectId: "open-hinata3",&ndash;&gt;-->
<!--&lt;!&ndash;  });&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  data() {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      groupName: "",&ndash;&gt;-->
<!--&lt;!&ndash;      groupId: "",&ndash;&gt;-->
<!--&lt;!&ndash;      email: "",&ndash;&gt;-->
<!--&lt;!&ndash;      loading: true,&ndash;&gt;-->
<!--&lt;!&ndash;      invalidGroupId: false,&ndash;&gt;-->
<!--&lt;!&ndash;    };&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  async mounted() {&ndash;&gt;-->
<!--&lt;!&ndash;    const params = new URLSearchParams(window.location.search);&ndash;&gt;-->
<!--&lt;!&ndash;    const groupIdParam = params.get("group");&ndash;&gt;-->

<!--&lt;!&ndash;    if (!groupIdParam) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.invalidGroupId = true;&ndash;&gt;-->
<!--&lt;!&ndash;      this.loading = false;&ndash;&gt;-->
<!--&lt;!&ndash;      return;&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->

<!--&lt;!&ndash;    try {&ndash;&gt;-->
<!--&lt;!&ndash;      const doc = await firebase.firestore()&ndash;&gt;-->
<!--&lt;!&ndash;          .collection("groups")&ndash;&gt;-->
<!--&lt;!&ndash;          .doc(groupIdParam)&ndash;&gt;-->
<!--&lt;!&ndash;          .get();&ndash;&gt;-->

<!--&lt;!&ndash;      if (doc.exists) {&ndash;&gt;-->
<!--&lt;!&ndash;        this.groupName = doc.data().name;&ndash;&gt;-->
<!--&lt;!&ndash;        this.groupId = doc.id;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;      console.error("Firestore取得エラー:", error);&ndash;&gt;-->
<!--&lt;!&ndash;    } finally {&ndash;&gt;-->
<!--&lt;!&ndash;      this.loading = false;&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    async submitJoin() {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.email || !/.+@.+\..+/.test(this.email)) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert("正しいメールアドレスを入力してください");&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const invitationRef = firebase.firestore().collection("invitations");&ndash;&gt;-->
<!--&lt;!&ndash;        const snapshot = await invitationRef&ndash;&gt;-->
<!--&lt;!&ndash;            .where("email", "==", this.email)&ndash;&gt;-->
<!--&lt;!&ndash;            .where("groupId", "==", this.groupId)&ndash;&gt;-->
<!--&lt;!&ndash;            .limit(1)&ndash;&gt;-->
<!--&lt;!&ndash;            .get();&ndash;&gt;-->

<!--&lt;!&ndash;        if (!snapshot.empty) {&ndash;&gt;-->
<!--&lt;!&ndash;          const doc = snapshot.docs[0];&ndash;&gt;-->
<!--&lt;!&ndash;          const currentStatus = doc.data().status;&ndash;&gt;-->

<!--&lt;!&ndash;          if (currentStatus === "joined") {&ndash;&gt;-->
<!--&lt;!&ndash;            alert("すでに参加済みです！");&ndash;&gt;-->
<!--&lt;!&ndash;            return;&ndash;&gt;-->
<!--&lt;!&ndash;          }&ndash;&gt;-->

<!--&lt;!&ndash;          await doc.ref.update({ status: "joined" });&ndash;&gt;-->
<!--&lt;!&ndash;          alert("🎉 参加が完了しました！");&ndash;&gt;-->
<!--&lt;!&ndash;        } else {&ndash;&gt;-->
<!--&lt;!&ndash;          await invitationRef.add({&ndash;&gt;-->
<!--&lt;!&ndash;            email: this.email,&ndash;&gt;-->
<!--&lt;!&ndash;            groupId: this.groupId,&ndash;&gt;-->
<!--&lt;!&ndash;            groupName: this.groupName,&ndash;&gt;-->
<!--&lt;!&ndash;            status: "requested",&ndash;&gt;-->
<!--&lt;!&ndash;            createdAt: new Date(),&ndash;&gt;-->
<!--&lt;!&ndash;          });&ndash;&gt;-->
<!--&lt;!&ndash;          alert("参加リクエストを送信しました！");&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;        this.email = "";&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (e) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error("送信エラー", e);&ndash;&gt;-->
<!--&lt;!&ndash;        alert("送信に失敗しました");&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;};&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->

<!--&lt;!&ndash;<style scoped>&ndash;&gt;-->
<!--&lt;!&ndash;.join-container {&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  justify-content: center;&ndash;&gt;-->
<!--&lt;!&ndash;  align-items: center;&ndash;&gt;-->
<!--&lt;!&ndash;  min-height: 100vh;&ndash;&gt;-->
<!--&lt;!&ndash;  background: #f2f5f9;&ndash;&gt;-->
<!--&lt;!&ndash;  font-family: "Segoe UI", sans-serif;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.card {&ndash;&gt;-->
<!--&lt;!&ndash;  background: white;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 40px 30px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;  text-align: center;&ndash;&gt;-->
<!--&lt;!&ndash;  width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  max-width: 420px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;h1 {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1.5rem;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #333;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 20px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;p {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 0.95rem;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 20px;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #666;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.input {&ndash;&gt;-->
<!--&lt;!&ndash;  width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 10px 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1rem;&ndash;&gt;-->
<!--&lt;!&ndash;  border: 1px solid #ccc;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 6px;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.btn {&ndash;&gt;-->
<!--&lt;!&ndash;  background: #4caf50;&ndash;&gt;-->
<!--&lt;!&ndash;  color: white;&ndash;&gt;-->
<!--&lt;!&ndash;  border: none;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 10px 20px;&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 1rem;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 6px;&ndash;&gt;-->
<!--&lt;!&ndash;  cursor: pointer;&ndash;&gt;-->
<!--&lt;!&ndash;  transition: 0.2s ease;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.btn:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  background: #45a049;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</style>&ndash;&gt;-->
