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
          :style="`background-color: ${internalValue} !important; color: white; min-width: 50px; height: 20px; border: 1px solid black;`"
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
    value: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      menu: false,
      internalValue: this.value
    }
  },
  watch: {
    value(newVal) {
      if (newVal !== this.internalValue) {
        this.internalValue = newVal
      }
    },
    internalValue(newVal) {
      if (this.menu) {
        this.$emit('change', newVal)
      }
    }
  }
}
</script>