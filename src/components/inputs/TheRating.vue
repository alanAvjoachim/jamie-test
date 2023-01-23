<template>
  <div class="star-rating flex items-center justify-start">
    <TheBody1 class="mr-4 text-primary">
      {{ label }}
    </TheBody1>
    <label
      class="star-rating__star"
      v-for="(rating, index) in state.ratings"
      :class="{
        'is-selected': state.tempValue >= rating && state.tempValue != null,
        'is-disabled': disabled
      }"
      :key="index"
      @click="set(rating)"
    >
      <input
        class="star-rating star-rating__checkbox"
        type="radio"
        :value="state.tempValue"
        :disabled="disabled"
      />
      <img
        src="/star_full.png"
        v-if="state.tempValue >= rating && state.tempValue != null"
      />
      <img src="/star.png" v-else />
    </label>
  </div>
</template>
<script>
import { reactive } from "vue";
import TheBody1 from "../typography/TheBody1.vue";

export default {
  props: {
    label: String,
    modelValue: {
      type: Number,
      default: 0
    },
    id: String,
    disabled: Boolean,
    required: Boolean
  },
  emits: ["update:modelValue", "change"],
  setup(props, context) {
    const state = reactive({
      ratings: [1, 2, 3, 4, 5],
      tempValue: null
    });
    function set(value) {
      if (!props.disabled) {
        state.tempValue = value;
        context.emit("update:modelValue", value);
        context.emit("change", value);
      }
    }
    return {
      state,
      set
    };
  },
  components: { TheBody1 }
};
</script>
<style>
.star-rating__checkbox {
  position: absolute;
  overflow: hidden;
  clip: rect(0 0 0 0);
  height: 1px;
  width: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
}

.star-rating__star {
  display: inline-block;
  padding: 3px;
  vertical-align: middle;
  line-height: 1;
  font-size: 1.2em;
  color: #ababab;
  transition: color 0.2s ease-out;
}
.star-rating__star:hover {
  cursor: pointer;
}
.star-rating__star.is-selected {
  color: white;
}
.star-rating__star.is-disabled:hover {
  cursor: default;
}
</style>
