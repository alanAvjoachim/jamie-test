<template>
  <textarea
    ref="theTextarea"
    class="resize-y bg-[#2C2C2C] border border-[#7E7E7E] text-primary rounded-md px-4 py-4 h-auto"
    @change="updateValue"
    @keydown.enter="resize"
    :placeholder="placeholder"
  >
  </textarea>
</template>
<script>
import { ref } from "vue";

export default {
  props: {
    modelValue: {
      type: String,
      default: null
    },
    placeholder: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue", "change"],
  setup(props, context) {
    const theTextarea = ref();

    function updateValue(event) {
      context.emit("update:modelValue", event.target.value);
      context.emit("change", event.target.value);
      resize();
    }

    function resize() {
      theTextarea.value.style.height =
        theTextarea.value.scrollHeight + 4 + "px";
    }

    return {
      theTextarea,
      updateValue,
      resize
    };
  }
};
</script>
