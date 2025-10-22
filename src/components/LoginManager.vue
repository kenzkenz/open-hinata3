<template>
  <v-dialog v-model="s_dialogForLogin" max-width="500px">
    <v-card>
      <v-card-title>
        ログイン管理
        <span
            v-if="((user1 && user1.displayName) || (s_myNickname && isLoggedIn))"
            style="margin-left:20px;font-size: 16px;"
        >
          ようこそ、{{ displayNameToShow }}さん！
        </span>
      </v-card-title>

      <v-card-text>
        <div style="margin-top: 10px;">
          <v-btn v-if="!user1" @click="loginDiv = !loginDiv; signUpDiv = false">ログイン</v-btn>
          <v-btn v-if="user1" @click="logOut">ログアウト</v-btn>
          <v-btn style="margin-left: 10px;" v-if="!user1" @click="signUpDiv = !signUpDiv; loginDiv = false">新規登録</v-btn>
          <span v-if="!user1" style="margin-left: 20px;">新規登録は無料です。</span>

          <div v-if="user1 && isLoggedIn">
            <hr style="margin-top: 20px;margin-bottom: 20px;">
            <p style="margin-bottom: 10px;">ニックネームを変更します。</p>
            <v-text-field
                v-model="newName"
                label="新しいニックネームを記入してください。"
                outlined
                dense
            />
            <v-btn color="primary" @click="updateDisplayName">ニックネーム変更</v-btn>
            <v-alert
                v-if="message"
                :type="alertType"
                dense
                outlined
                class="mt-2"
                v-html="message"
            />
          </div>

          <div v-if="loginDiv" style="margin-top: 10px;">
            <v-text-field v-model="email" type="email" placeholder="メールアドレス" />
            <v-text-field v-model="password" type="password" placeholder="パスワード" />
            <v-btn @click="login">ログインします</v-btn>
            <p style="margin-top: 10px;" v-if="errorMsg">{{ errorMsg }}</p>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <div v-if="signUpDiv" style="margin-top: 10px;">
            <v-text-field v-model="nickname" type="text" placeholder="ニックネーム" />
            <v-text-field v-model="email" type="email" placeholder="メールアドレス" />
            <v-text-field v-model="password" type="password" placeholder="パスワード" />
            <v-btn @click="signUp">新規登録します</v-btn>
            <p style="margin-top: 10px;" v-if="errorMsg">{{ errorMsg }}</p>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="blue-darken-1" text @click="s_dialogForLogin = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import store from '@/store'
import { db, auth } from '@/firebase'
import firebase from '@/firebase'
import { user as user1 } from '@/authState' // 既存のグローバル認証状態

export default {
  name: 'LoginManager',
  data () {
    return {
      // ローカル状態
      isLoggedIn: false,
      loginDiv: false,
      signUpDiv: false,

      newName: '',
      message: '',
      alertType: 'info',

      nickname: '',
      email: '',
      password: '',
      errorMsg: '',

      // authState の参照（テンプレートから使えるように data に載せる）
      user1,
    }
  },
  computed: {
    // ダイアログ開閉は既存の Vuex を利用
    s_dialogForLogin: {
      get () {
        return store.state.dialogForLogin
      },
      set (v) {
        store.state.dialogForLogin = v
      }
    },
    s_myNickname () {
      return store.state.myNickname
    },
    displayNameToShow () {
      const n1 = this.newName
      const n2 = this.s_myNickname
      const n3 = this.user1 && this.user1.displayName
      return n1 || n2 || n3 || ''
    },
  },
  methods: {
    async createUserDirectory () {
      try {
        if (!this.user1 || !this.user1.getIdToken) return
        const token = await this.user1.getIdToken()
        const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/create_directory.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        })
        const data = await response.json()
        if (!response.ok) {
          console.error('エラー:', data)
          return
        }
        console.log('ディレクトリ作成成功:', data)
      } catch (e) {
        console.error('ディレクトリ作成エラー:', e)
      }
    },

    updateDisplayName () {
      const u = auth.currentUser
      if (!u) {
        this.message = 'ログインユーザーが見つかりません'
        this.alertType = 'error'
        return
      }
      if (!this.newName) {
        this.message = '新ニックネームを入力してください'
        this.alertType = 'error'
        return
      }
      u.updateProfile({ displayName: this.newName })
          .then(() => {
            this.message = 'ニックネームを変更しました。<br>念の為OH3を一度閉じて<br>再読み込みしてください。'
            this.alertType = 'success'
            store.state.myNickname = this.newName
            const el = document.querySelector('#drag-handle-menuDialog-map01')
            if (el) {
              el.innerHTML = `<span style="font-size: large;">メニュー　ようこそ${this.displayNameToShow}さん</span>`
            }
          })
          .catch(err => {
            console.error(err)
            this.message = '更新に失敗しました'
            this.alertType = 'error'
          })
    },

    logOut () {
      const run = async () => {
        try {
          await firebase.auth().signOut()
          store.state.userId = 'dummy'
          store.state.fetchImagesFire = !store.state.fetchImagesFire
          const el = document.querySelector('#drag-handle-menuDialog-map01')
          if (el) el.innerHTML = '<span style="font-size: large;">メニュー</span>'
          this.isLoggedIn = false
          localStorage.setItem('lastUserId', '')
          localStorage.setItem('lastNickname', '')
          alert('ログアウトしました')
        } catch (e) {
          console.error('ログアウトエラー:', e.message)
        }
      }
      run()
    },

    signUp () {
      if (!(this.email && this.password && this.nickname)) {
        alert('入力されていません。')
        return
      }
      const run = async () => {
        try {
          const cred = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password)
          await firebase.auth().currentUser.updateProfile({ displayName: this.nickname })
          await this.createUserDirectory()
          alert(`登録成功！ようこそ、${this.nickname} さん！`)
          store.state.myNickname = this.nickname
          this.errorMsg = ''
          this.signUpDiv = false
        } catch (e) {
          console.error('サインアップ失敗:', e.message)
          switch (e.code) {
            case 'auth/user-not-found':
              this.errorMsg = 'ユーザーが見つかりません'
              break
            case 'auth/wrong-password':
              this.errorMsg = 'パスワードが違います'
              break
            case 'auth/invalid-email':
              this.errorMsg = '無効なメールアドレスです'
              break
            default:
              this.errorMsg = '登録に失敗しました'
          }
        }
      }
      run()
    },

    login () {
      const run = async () => {
        try {
          const cred = await firebase.auth().signInWithEmailAndPassword(this.email, this.password)
          const u = cred.user
          if (!u) {
            this.errorMsg = 'ログインは成功しましたが、ユーザー情報が取得できません'
            return
          }

          await this.createUserDirectory()
          this.errorMsg = 'ログイン成功'
          this.loginDiv = false
          store.state.userId = u.uid
          store.state.fetchImagesFire = !store.state.fetchImagesFire

          // 所属グループ名の取得は既存ロジックに委ねる（必要ならここで store へ反映）
          const userDoc = await db.collection('users').doc(u.uid).get()
          const groups = userDoc.exists ? userDoc.data().groups : []
          if (groups && groups.length > 0) {
            const groupId = groups[0]
            const groupDoc = await db.collection('groups').doc(groupId).get()
            if (groupDoc.exists) {
              // 必要に応じて store.commit などで扱う
            }
          }
        } catch (e) {
          console.error('ログイン失敗:', e.message)
          switch (e.code) {
            case 'auth/user-not-found':
              this.errorMsg = 'ユーザーが見つかりません'
              break
            case 'auth/wrong-password':
              this.errorMsg = 'パスワードが違います'
              break
            case 'auth/invalid-email':
              this.errorMsg = '無効なメールアドレスです'
              break
            default:
              this.errorMsg = 'ログインに失敗しました'
          }
        }
      }
      run()
    },
  },
  mounted () {
    // メニューヘッダ初期化（互換維持）
    const el = document.querySelector('#drag-handle-menuDialog-map01')
    if (el) el.innerHTML = '<span style="font-size: large;">メニュー</span>'

    if (!store.state.isOffline) {
      firebase.auth().onAuthStateChanged(async (u) => {
        if (u && u.email) {
          console.log('✅ ログイン中のユーザー:', u.email)
          store.state.myNickname = u.displayName || ''
          this.newName = u.displayName || ''
          this.isLoggedIn = true
          this.$nextTick(() => {
            if (el) {
              el.innerHTML = `<span style="font-size: large;">メニュー ようこそ${u.displayName || ''}さん</span>`
            }
          })
        } else {
          console.warn('⚠️ ログイン中のユーザーが見つかりません')
        }
      })
    }
  }
}
</script>
