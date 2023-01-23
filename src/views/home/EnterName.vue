<template>
  <TheHomeContainer :hideBg="true">
    <div class="flex flex-col justify-center items-start h-screen px-24 pb-32">
      <TheTitle class="text-primary">Nice!</TheTitle>
      <TheBody1 class="text-secondary mt-2">
        Enter the name of the meeting
      </TheBody1>
      <TheTextInput
        class="mt-10 max-w-md"
        placeholder="Enter a meeting title"
        v-model="state.name"
        @enter="onEnter"
      />
      <div class="flex justify-center items-center w-full mt-12">
        <TheLabel class="text-secondary"> Press enter to continue </TheLabel>
      </div>
    </div>
  </TheHomeContainer>
</template>
<script>
import TheHomeContainer from "../../components/containers/TheHomeContainer.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import TheTextInput from "../../components/inputs/TheTextInput.vue";
import TheLabel from "../../components/typography/TheLabel.vue";
import { useRouter } from "vue-router";
import { useMeetingStore } from "../../stores";
import { reactive } from "vue";

export default {
  components: {
    TheHomeContainer,
    TheBody1,
    TheTitle,
    TheTextInput,
    TheLabel
  },
  data: () => ({}),
  setup() {
    const router = useRouter();
    const meetingStore = useMeetingStore();

    let state = reactive({
      name: ""
    });

    async function onEnter() {
      if (state.name.length > 1) {
        await meetingStore.updateMeetingDoc(meetingStore.meetingId, {
          title: state.name
        });
        router.push("home");
      } else {
        state.errorMessage = "Please enter valid name.";
      }
    }
    return {
      state,
      onEnter,
    };
  }
};
</script>
