<template>
  <div class="bg-background h-screen w-screen">
    <img
      v-if="!hideBg"
      src="/bg_1.png"
      class="absolute right-0 top-0 max-h-full w-full"
    />
    <div>
      <OfflineBanner />
      <div class="w-full relative z-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script>
import OfflineBanner from "../banners/OfflineBanner.vue";

export default {
  props: {
    hideBg: {
      type: Boolean,
      default: false
    }
  },
  components: { OfflineBanner }
};
</script>
