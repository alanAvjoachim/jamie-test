<template>
  <div>
    <div class="bg-accent h-screen w-screen fixed opacity-90 z-10"></div>
    <div
      class="flex flex-col h-screen w-screen fixed items-center justify-center text-primary z-20"
    >
      <div class="max-w-xs">
        <TheTitle>You’ve reached your meeting limit</TheTitle>
        <TheBody1 class="my-7"
          >Every additional meeting will be charged with
          {{ getAdditionalMeetingPrice() }} at the end of the month</TheBody1
        >
        <div class="flex items-center justify-center">
          <ThePrimaryButton class="mt-4 w-44" @click="startJamie">
            <div class="flex items-center justify-center">
              <img class="w-3" src="/play.png" />
              <TheBody1 class="text-background ml-3">Start jamie</TheBody1>
            </div>
          </ThePrimaryButton>
        </div>
        <div
          class="flex items-center justify-center text-secondary underline cursor-pointer text-sm my-6"
          @click="closeModal"
        >
          Cancel
        </div>
        <div
          v-if="state.userDetails.subType != 'Executive Monthly'"
          class="flex items-center justify-center text-secondary underline cursor-pointer text-sm"
          @click="goToSelectPlan"
        >
          Switch plan
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive } from "vue";
import TheBody1 from "../typography/TheBody1.vue";
import TheTitle from "../typography/TheTitle.vue";
import { useAuthStore } from "../../stores";
import ThePrimaryButton from "../buttons/ThePrimaryButton.vue";
export default {
  components: {
    TheTitle,
    TheBody1,
    ThePrimaryButton
  },
  emits: ["closeModal", "startJamie", "goToSelectPlan"],
  setup(props, context) {
    const authStore = useAuthStore();

    let state = reactive({
      userDetails: computed(() => authStore.userDetails)
    });

    function getAdditionalMeetingPrice() {
      switch (state.userDetails.subType) {
        case "Standard Monthly":
          return "4€";
        case "Pro Monthly":
          return "2€";
        case "Executive Monthly":
          return "1€";
        default:
          return "4€";
      }
    }

    function closeModal() {
      context.emit("closeModal");
    }

    function startJamie() {
      context.emit("startJamie");
    }

    function goToSelectPlan() {
      context.emit("goToSelectPlan");
    }

    return {
      state,
      getAdditionalMeetingPrice,
      closeModal,
      startJamie,
      goToSelectPlan
    };
  }
};
</script>

<style></style>
