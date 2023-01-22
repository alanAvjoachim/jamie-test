<template>
  <div class="flex flex-col">
    <input
      class="focus:outline-none bg-background placeholder:text-secondary text-primary text-2xl placeholder:font-semibold font-semibold"
      :placeholder="placeholder"
      @keyup.enter="onEnter"
      :value="modelValue"
      @input="updateValue"
    />
    <div class="border-2 border-secondary mt-3"></div>
    <TheLabel class="text-red-600 mt-1">
      {{ errorMessage }}
    </TheLabel>
  </div>
</template>
<script>
import TheLabel from "../typography/TheLabel.vue";
export default {
  components: { TheLabel },
  props: {
    placeholder: {
      type: String,
      default: ""
    },
    errorMessage: {
      type: String,
      default: ""
    },
    modelValue: [String, Number]
  },
  setup(props, context) {
    function updateValue(event) {
      context.emit("update:modelValue", event.target.value);
    }

    function onEnter() {
      context.emit("enter");
    }

    return {
      onEnter,
      updateValue
    };
  }
};
</script>
