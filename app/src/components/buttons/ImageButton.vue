<template>
  <button
    class="text-primary text-sm hover:text-secondary transform active:text-secondary transition-transform"
    :disabled="loading"
  >
    <div class="flex flex-col justify-center items-center">
      <div
        class="bg-[#3A3A3A70] border border-[#949494] rounded-md flex flex-col justify-center items-center px-9 py-4 mb-2"
      >
        <slot></slot>
        <img class="w-6" :src="img" v-if="img" />
      </div>
      <TheBody1 class="mt-2" v-if="text">{{ text }}</TheBody1>
      <TheBody1 class="text-secondary mt-4" v-if="subText">{{
        subText
      }}</TheBody1>
    </div>
  </button>
</template>
<script>
import TheBody1 from "../typography/TheBody1.vue";

export default {
  components: { TheBody1 },
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: ""
    },
    subText: {
      type: String,
      default: ""
    },
    img: {
      type: String,
      default: ""
    }
  }
};
</script>
