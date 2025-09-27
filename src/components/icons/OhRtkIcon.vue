# フォルダ構成（例）
# src/
# ├─ assets/icons/oh-rtk.png   ← ここにこの画像を置く
# ├─ components/icons/OhRtkIcon.vue
# └─ plugins/vuetify.js

// ===============================
// components/icons/OhRtkIcon.vue
// ===============================
<template>
  <img :src="iconSrc" :alt="alt" class="oh-rtk-icon" />
</template>

<script>
import iconSrc from '@/assets/icons/oh-rtk.png'
export default {
  name: 'OhRtkIcon',
  props: { alt: { type: String, default: '' } },
  data () {
    return { iconSrc }
  },
}
</script>

<style scoped>
.oh-rtk-icon {
  display: block;
  width: 1em;
  height: 1em;
  object-fit: contain;
}
</style>

// ===============================
// plugins/vuetify.ts （抜粋）
//   既存の Vuetify 作成コードに icons の alias を1行足すだけ
// ===============================
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import OhRtkIcon from '@/components/icons/OhRtkIcon.vue'

export default createVuetify({
icons: {
defaultSet: 'mdi',
aliases: {
...aliases,
'oh-rtk': OhRtkIcon,
},
sets: { mdi },
},
})

