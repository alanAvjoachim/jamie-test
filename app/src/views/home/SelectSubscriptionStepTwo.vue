<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Choose a plan</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please select the plan that suits you best
    </TheBody1>
    <div class="mt-32 flex items-center justify-center">
      <TheBody1 class="text-secondary font-medium text-[21px] text-center"
        >Please finish your plan selection in your browser window.</TheBody1
      >
    </div>
    <div class="flex justify-start items-center mt-10">
      <ThePrimaryTextButton @click="goBack">
        <TheBody1 class="underline text-secondary">Cancel</TheBody1>
      </ThePrimaryTextButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import { computed, onMounted, onUnmounted, reactive, watch } from "vue";
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
      userDetails: computed(() => authStore.userDetails),
      oldUserDetails: {},
      subscribeCheck: false
    });

    watch(
      () => state.userDetails,
      () => {
        checkIfUserSubscribed();
      }
    );

    onMounted(async () => {
      state.user = await authStore.getUser();
      state.oldUserDetails = await authStore.getUserDetails();
      authStore.subscribeUser(state.user.uid);
    });

    onUnmounted(() => {
      authStore.unsubscribeUser();
    });

    async function goBack() {
      router.push("select-subscription");
    }

    function checkIfUserSubscribed() {
      if (
        state.userDetails.subType &&
        state.userDetails.subType !== "free" &&
        !state.subscribeCheck
      ) {
        router.push("select-subscription-step-3");
        state.subscribeCheck = true;
      }
    }

    return {
      state,
      goBack
    };
  }
};
</script>
