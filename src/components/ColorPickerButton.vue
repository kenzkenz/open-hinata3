<!-- components/ColorPickerButton.vue -->
<template>
  <v-menu
      v-model="menu"
      :close-on-content-click="false"
      location="bottom"
      offset-y
  >
    <template #activator="{ props }">
      <v-btn
          v-bind="props"
          :style="`background-color: ${internalValue} !important; color: white; min-width: 50px; height: 20px; font-size: 12px;`"
          variant="flat"
          class="ma-2"
      >click</v-btn>
    </template>
    <v-color-picker
        v-show="menu"
        v-model="internalValue"
        mode="rgba"
        width="300"
    />
  </v-menu>
</template>

<script>
export default {
  name: 'ColorPickerButton',
  props: {
    value: String
  },
  data() {
    return {
      menu: false,
      internalValue: this.value || 'black'
    }
  },
  watch: {
    internalValue(val) {
      this.$emit('input', val) // for v-model
      this.$emit('update:modelValue', val) // optional Vuetify 3 v-model
    },
    value(val) {
      this.internalValue = val
    }
  }
}
</script>
