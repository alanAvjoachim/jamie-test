<template>
  <div class="flex flex-col text-center items-center justify-center">
    <p
      class="p-4 bg-[#3A3A3A70] text-white rounded-md border cursor-pointer"
      :class="active ? 'border-[#00A3FF]' : 'border-[#949494]'"
    >
      {{ title }}
    </p>
    <p class="text-white mt-8">{{ subtitle }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    subtitle: String,
    active: {
      type: Boolean,
      default: false
    }
  }
};
</script>
