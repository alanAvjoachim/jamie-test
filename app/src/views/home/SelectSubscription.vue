<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Choose a plan</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please select the plan that suits you best
    </TheBody1>
    <div class="mt-11 items-center">
      <ImageButton
        text="24€/month"
        subText="up to 15 meetings"
        class="mr-8"
        @click="openStandardSubscription"
      >
        <TheBody1 class="text-center w-full"> Standard </TheBody1>
      </ImageButton>
      <ImageButton
        text="47€/month"
        subText="up to 40 meetings"
        class="mr-8"
        @click="openProSubscription"
      >
        <TheBody1 class="text-center w-full"> Pro </TheBody1>
      </ImageButton>
      <ImageButton
        text="96€/month"
        subText="up to 100 meetings"
        class="mt-6"
        @click="openExecutiveSubscription"
      >
        <TheBody1 class="text-center w-full"> Executive </TheBody1>
      </ImageButton>
    </div>
    <div class="flex justify-start items-center mt-10">
      <ThePrimaryTextButton @click="selectFreeSubscription">
        <TheBody1 class="underline text-secondary">
          I want to get started for free first
        </TheBody1>
      </ThePrimaryTextButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import { reactive } from "vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import ImageButton from "../../components/buttons/ImageButton.vue";
import { useAuthStore } from "../../stores";
import { useRouter } from "vue-router";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    ThePrimaryTextButton,
    ImageButton
  },
  setup() {
    const authStore = useAuthStore();
    const state = reactive({});
    const router = useRouter();

    async function openStandardSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openStandardStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-subscription-step-2");
    }

    async function openProSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openProStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-subscription-step-2");
    }

    async function openExecutiveSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openExecutiveStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-subscription-step-2");
    }

    async function selectFreeSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.identifyUser(user.uid, {
        subscriptionType: "free"
      });
      router.push("free-trial");
    }

    return {
      state,
      openStandardSubscription,
      openProSubscription,
      openExecutiveSubscription,
      selectFreeSubscription
    };
  }
};
</script>
