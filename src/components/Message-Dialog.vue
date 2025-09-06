<!-- File: Message-Dialog.vue -->
<template>
  <v-dialog
      v-model="isOpen"
      :max-width="finalMaxWidth"
      :persistent="finalPersistent"
      :scrollable="finalScrollable"
  >
    <!-- Vuetify v2 activator slot -->
    <template v-slot:activator="{ on, attrs }">
      <slot name="activator" v-bind="{ on, attrs }" />
    </template>

    <v-card v-bind="finalCardProps">
      <v-card-title class="d-flex align-center">
        <slot name="title">
          <span v-if="finalTitle">{{ finalTitle }}</span>
        </slot>
        <v-spacer />
        <v-btn v-if="finalShowCloseIcon" icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider v-if="showTitleDivider" />

      <v-card-text>
        <!-- デフォルト: contentHtml を v-html で描画。slot を使えば自由HTML差し替え可 -->
        <slot>
          <div v-if="finalContentHtml" v-html="finalContentHtml" />
        </slot>
      </v-card-text>

      <v-divider v-if="showActionsDivider" />

      <v-card-actions>
        <slot name="actions">
          <v-spacer />
          <v-btn
              v-bind="closeBtnProps"
              :color="finalCloseColor"
              @click="close"
          >
            {{ finalCloseText }}
          </v-btn>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'MessageDialog',
  // Vue2 の v-model 対応
  model: { prop: 'value', event: 'input' },
  props: {
    // v-model（ローカル制御用）
    value: { type: Boolean, default: false },
    // タイトル（slot title で上書き可）
    title: { type: String, default: '' },
    // 本文を HTML 文字列で渡す場合
    contentHtml: { type: String, default: '' },

    // v-dialog
    maxWidth: { type: [Number, String], default: 500 },
    persistent: { type: Boolean, default: false },
    scrollable: { type: Boolean, default: true },
    // v-card にそのまま渡すオブジェクト（rounded, elevation など）
    cardProps: { type: Object, default: () => ({}) },
    // フッターの閉じるボタン
    closeText: { type: String, default: '閉じる' },
    closeColor: { type: String, default: 'primary' },
    // Vuetify2 互換: 'text' | 'outlined' | 'flat'(既定) など
    closeVariant: { type: String, default: 'text' },
    // 上部 X ボタン表示
    showCloseIcon: { type: Boolean, default: false },
    // 区切り線の表示
    showTitleDivider: { type: Boolean, default: false },
    showActionsDivider: { type: Boolean, default: false },

    // ====== グローバル制御（親以外から開閉）用 ======
    // true にすると Vuex モードで動作
    useStore: { type: Boolean, default: false },
    // レジストリのキー（複数ダイアログを識別）
    dialogId: { type: String, default: 'default' },
    // 使用する Vuex モジュール名（名前空間）
    storeModule: { type: String, default: 'messageDialog' }
  },
  computed: {
    // 現在の名前空間
    ns () { return this.storeModule },
    // Vuex 登録内容（なければ null）
    entry () {
      if (!this.useStore) return null
      const getter = this.$store?.getters?.[`${this.ns}/entry`]
      return typeof getter === 'function' ? getter(this.dialogId) : null
    },
    // 開閉制御
    isOpen: {
      get () {
        return this.useStore ? !!(this.entry && this.entry.open) : this.value
      },
      set (val) {
        if (this.useStore) {
          this.$store.dispatch(`${this.ns}/setOpen`, { id: this.dialogId, open: val })
          this.$emit(val ? 'open' : 'close')
        } else {
          if (val !== this.value) {
            this.$emit('input', val)
            this.$emit(val ? 'open' : 'close')
          } else {
            this.$emit('input', val)
          }
        }
      }
    },
    // 表示内容/見た目の最終決定（Vuex > props）
    finalTitle () {
      return (this.entry && this.entry.title) || this.title
    },
    finalContentHtml () {
      return (this.entry && this.entry.contentHtml) || this.contentHtml
    },
    finalMaxWidth () {
      return (this.entry && this.entry.options && this.entry.options.maxWidth) || this.maxWidth
    },
    finalPersistent () {
      return (this.entry && this.entry.options && this.entry.options.persistent) ?? this.persistent
    },
    finalScrollable () {
      return (this.entry && this.entry.options && this.entry.options.scrollable) ?? this.scrollable
    },
    finalCardProps () {
      const o = (this.entry && this.entry.options && this.entry.options.cardProps) || {}
      return Object.assign({}, this.cardProps, o)
    },
    finalCloseText () {
      return (this.entry && this.entry.options && this.entry.options.closeText) || this.closeText
    },
    finalCloseColor () {
      return (this.entry && this.entry.options && this.entry.options.closeColor) || this.closeColor
    },
    finalCloseVariant () {
      return (this.entry && this.entry.options && this.entry.options.closeVariant) || this.closeVariant
    },
    finalShowCloseIcon () {
      return (this.entry && this.entry.options && this.entry.options.showCloseIcon) ?? this.showCloseIcon
    },
    // Vuetify2 で variant 相当をマッピング
    closeBtnProps () {
      const v = (this.finalCloseVariant || '').toLowerCase()
      if (v === 'text' || v === 'flat') return { text: true }
      if (v === 'outlined') return { outlined: true }
      if (v === 'contained' || v === 'elevated') return { } // 既定
      return { }
    }
  },
  methods: {
    open (payload) {
      if (this.useStore) {
        // 追加で内容も更新したい場合 payload を渡す
        if (payload && typeof payload === 'object') {
          this.$store.dispatch(`${this.ns}/open`, Object.assign({ id: this.dialogId }, payload))
        } else {
          this.$store.dispatch(`${this.ns}/setOpen`, { id: this.dialogId, open: true })
        }
      } else {
        this.$emit('input', true)
        this.$emit('open')
      }
    },
    close () {
      if (this.useStore) {
        this.$store.dispatch(`${this.ns}/setOpen`, { id: this.dialogId, open: false })
      } else {
        this.$emit('input', false)
        this.$emit('close')
      }
    }
  }
}
</script>

<style scoped>
/* 必要なら細かい見た目をここに */
</style>

/* =============================================================
Vuex モジュール（store/modules/messageDialog.js）
- 親以外からでも this.$store.dispatch('messageDialog/open', {...}) で開ける
- 複数ダイアログは id で識別
- コンポーネント側の :store-module で名前空間を差し替え可能
============================================================= */

// 例: store/modules/messageDialog.js
// -------------------------------------------------------------
// export default {
//   namespaced: true,
//   state: () => ({ registry: {} }),
//   getters: {
//     entry: (state) => (id = 'default') => state.registry[id] || { open: false }
//   },
//   mutations: {
//     SET_ENTRY (state, { id = 'default', patch = {} }) {
//       const cur = state.registry[id] || {}
//       state.registry = { ...state.registry, [id]: { ...cur, ...patch } }
//     },
//     SET_OPEN (state, { id = 'default', open }) {
//       const cur = state.registry[id] || {}
//       state.registry = { ...state.registry, [id]: { ...cur, open: !!open } }
//     }
//   },
//   actions: {
//     open ({ commit }, { id = 'default', title, contentHtml, options } = {}) {
//       commit('SET_ENTRY', { id, patch: { title, contentHtml, options, open: true } })
//     },
//     close ({ commit }, { id = 'default' } = {}) {
//       commit('SET_OPEN', { id, open: false })
//     },
//     setOpen ({ commit }, { id = 'default', open }) {
//       commit('SET_OPEN', { id, open })
//     },
//     update ({ commit }, { id = 'default', patch = {} } = {}) {
//       commit('SET_ENTRY', { id, patch })
//     }
//   }
// }

/* 使い方（どこからでも）
-------------------------------------------------------------
// 1) 開く（内容もまとめて指定）
this.$store.dispatch('messageDialog/open', {
id: 'help',
title: 'ヘルプ',
contentHtml: '<p>ショートカット一覧...</p>',
options: { maxWidth: 700, showCloseIcon: true }
})

// 2) 閉じる
this.$store.dispatch('messageDialog/close', { id: 'help' })

// 3) 表示中に内容だけ更新
this.$store.dispatch('messageDialog/update', {
id: 'help',
patch: { contentHtml: '<p>更新後の内容</p>' }
})

// 4) コンポーネント側（どこか一箇所に置く）
// <message-dialog :use-store="true" :store-module="'messageDialog'" dialog-id="help" />
*/

<!--
使い方サンプル（Vue2 Options API / ローカル制御）
==================================================
1) 文字列 HTML を直接差し込む（最小セット）

<template>
  <message-dialog
    v-model="dlg"
    title="HTMLで書ける様に"
    :content-html="html"
    :max-width="600"
    :show-close-icon="true"
  />
  <v-btn @click="dlg = true">開く</v-btn>
</template>

<script>
import MessageDialog from '@/components/common/Message-Dialog.vue'
export default {
  components: { MessageDialog },
  data: () => ({
    dlg: false,
    html: `
      <h3>任意の <em>HTML</em></h3>
      <p><strong>太字</strong>や<a href='#'>リンク</a>もOK。</p>
    `
  })
}
</script>

2) slot で完全カスタム（アクション差し替え）

<message-dialog v-model="dlg2" :persistent="true">
  <template v-slot:title>
    任意タイトル
  </template>
  <div>
    <p>自由に HTML を書けます。</p>
  </div>
  <template v-slot:actions>
    <v-spacer />
    <v-btn text @click="dlg2 = false">キャンセル</v-btn>
    <v-btn color="primary" @click="submit()">OK</v-btn>
  </template>
</message-dialog>

3) activator slot を使う（v-dialog 標準の開閉制御）

<message-dialog v-model="dlg3">
  <template v-slot:activator="{ on, attrs }">
    <v-btn v-bind="attrs" v-on="on">開く</v-btn>
  </template>
  <div>こんにちは</div>
</message-dialog>

4) プログラムから開閉（ref 経由）

<message-dialog ref="d" :value="false" />
// this.$refs.d.open() / this.$refs.d.close()

※ 注意: contentHtml に外部入力を渡す場合は XSS に注意。
-->
