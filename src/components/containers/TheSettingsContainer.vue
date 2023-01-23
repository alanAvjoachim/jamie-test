<template>
  <div class="bg-background h-screen w-screen">
    <OfflineBanner />
    <div class="absolute px-12 pt-16 z-50">
      <slot></slot>
    </div>
    <img class="absolute -bottom-14 mx-12 my-0 w-12" src="/logo_text.png" />
  </div>
</template>

<script>
import OfflineBanner from "../banners/OfflineBanner.vue";
export default {
  components: { OfflineBanner }
};
</script>
