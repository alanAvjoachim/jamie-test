<template>
  <button
    class="bg-primary text-background text-sm rounded-full px-6 py-2 hover:bg-slate-100"
    :class="{
      'transform active:scale-y-95 active:scale-x-95 transition-transform':
        !loading,
      'opacity-25 cursor-not-allowed': disabled
    }"
    :disabled="loading || disabled"
  >
    <div class="flex justify-center items-center">
      <img src="/loading.png" class="animate-spin" v-if="loading" />
      <slot v-else></slot>
    </div>
  </button>
</template>
<script>
export default {
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
};
</script>
