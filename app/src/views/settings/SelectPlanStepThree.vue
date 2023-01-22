<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Choose a plan</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please select the plan that suits you best
    </TheBody1>
    <div class="mt-11 flex items-center justify-center">
      <img src="/undraw_well_done.png" class="w-36" />
    </div>
    <div class="mt-11 flex items-center justify-center">
      <TheBody1 class="text-secondary font-medium text-[21px] text-center"
        >Well done! You are on the {{ getUserPlan() }} plan now.</TheBody1
      >
    </div>
    <div class="flex justify-center items-center mt-10">
      <ThePrimaryTextButton @click="onClickNextStep">
        <TheBody1 class="underline text-secondary">
          Continue to jamie
        </TheBody1>
      </ThePrimaryTextButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import { onMounted, reactive } from "vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    ThePrimaryTextButton
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      user: {},
      userDetails: {}
    });

    onMounted(async () => {
      state.user = await authStore.getUser();
      state.userDetails = await authStore.getUserDetails();
    });

    function getUserPlan() {
      if (
        state.userDetails &&
        state.userDetails.subType &&
        state.userDetails.subType !== "free"
      ) {
        switch (state.userDetails.subType) {
          case "Standard Monthly":
            return "Standard";
          case "Pro Monthly":
            return "Pro";
          case "Executive Monthly":
            return "Executive";
          default:
            return "Free";
        }
      }
      return "Free";
    }

    async function onClickNextStep() {
      router.push("home");
    }

    return {
      state,
      onClickNextStep,
      getUserPlan
    };
  }
};
</script>
