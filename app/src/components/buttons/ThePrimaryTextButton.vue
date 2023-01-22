<template>
  <button
    class="text-primary text-sm"
    :class="
      loading ? '' : 'transform active:text-secondary transition-transform'
    "
    :disabled="loading"
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
    }
  }
};
</script>
