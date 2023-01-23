<template>
  <div class="flex justify-start items-center mb-5">
    <div
      class="bg-white rounded-full h-9 w-9 flex justify-center items-center hover:bg-slate-100 cursor-pointer mr-4"
      @click="speakers.isPlaying ? pause() : play()"
    >
      <img v-if="speakers.isPlaying" src="/pause_audio.png" class="w-5" />
      <img v-else src="/play_audio.png" class="w-5" />
    </div>
    <TheTextInput
      class="max-w-md"
      v-model="speakers.name"
      :placeholder="placeholder"
    />
  </div>
</template>

<script>
import TheTextInput from "../inputs/TheTextInput.vue";
export default {
  props: {
    speakers: {
      type: Object,
      required: true
    },
    placeholder: {
      type: String,
      required: true
    }
  },
  setup(props) {
    function play() {
      if (props.speakers.file.duration > 6) {
        props.speakers.file.currentTime = 2;
      } else {
        props.speakers.file.currentTime = 0;
      }
      props.speakers.isPlaying = true;
      props.speakers.file.play();
    }
    function pause() {
      props.speakers.isPlaying = false;
      props.speakers.file.pause();
    }
    return {
      play,
      pause
    };
  },
  components: { TheTextInput }
};
</script>
