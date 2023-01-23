<template>
  <div class="bg-background h-screen w-screen">
    <img
      v-if="!hideBg"
      src="/bg_2.png"
      class="fixed right-0 top-0 max-h-full w-full z-0"
    />
    <OfflineBanner />
    <div class="absolute px-12 py-16 z-50">
      <slot></slot>
    </div>
    <img class="absolute bottom-0 mx-11 my-10 w-12" src="/logo_text.png" />
    <a
      @click="quitApp"
      class="text-secondary absolute bottom-0 my-10"
      style="margin-left: 420px; cursor: pointer"
      >Quit</a
    >
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
  setup() {
    function quitApp() {
      window.electronAPI.quitApp();
    }
    return {
      quitApp
    };
  },
  components: { OfflineBanner }
};
</script>
