<template>
  <select class="bg-background outline-none">
    <option
      v-for="(option, index) in options"
      :key="index"
      :value="option.value"
      :selected="option.value == modelValue"
      @change="updateValue"
    >
      {{ option.name }}
    </option>
  </select>
</template>
  
<script>
export default {
  props: {
    options: {
      type: Array,
      default: () => []
    },
    modelValue: {
      type: [String, Number, Boolean],
      default: ""
    }
  },
  emits: ["update:modelValue"],
  setup(props, context) {
    function updateValue(event) {
      context.emit("update:modelValue", event.target.value);
    }
    return {
      updateValue
    };
  }
};
</script>
