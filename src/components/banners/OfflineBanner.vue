<template>
  <div
    v-if="state.offline"
    class="bg-[#e64848] h-8 text-center text-primary items-center justify-center flex text-sm relative z-10"
  >
    no internet connection... this could cause problems
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { useAuthStore } from "../../stores";
export default {
  setup() {
    const authStore = useAuthStore();
    const state = reactive({
      offline: computed(() => authStore.offline)
    });

    onMounted(() => {
      authStore.runOfflineDetection();
    });

    onUnmounted(() => {
      authStore.stopOfflineDetection();
    });

    return { state };
  }
};
</script>
