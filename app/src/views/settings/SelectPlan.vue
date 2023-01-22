<template>
  <TheSettingsContainer>
    <ThePrimaryTextButton class="mb-2" @click="goBack">
      <div class="flex justify-start items-center text-secondary">
        <img class="w-1.5 mr-3" src="/back.png" />
        Go back
      </div>
    </ThePrimaryTextButton>
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
  </TheSettingsContainer>
</template>

<script>
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import TheSettingsContainer from "../../components/containers/TheSettingsContainer.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import { useRouter } from "vue-router";
import TheBody1 from "../../components/typography/TheBody1.vue";
import { onMounted, reactive } from "vue";
import { useAuthStore } from "../../stores";
import ImageButton from "../../components/buttons/ImageButton.vue";

export default {
  components: {
    TheSettingsContainer,
    ThePrimaryTextButton,
    TheTitle,
    TheBody1,
    ImageButton
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      user: {}
    });

    onMounted(async () => {
      state.user = await authStore.getUserDetails();
    });

    async function openStandardSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openStandardStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-plan-step-2");
    }

    async function openProSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openProStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-plan-step-2");
    }

    async function openExecutiveSubscription() {
      const user = await authStore.getUser();
      window.electronAPI.openExecutiveStripeSub({
        uid: user.uid,
        email: user.email
      });
      router.push("select-plan-step-2");
    }

    const goBack = () => {
      router.push("settings");
    };

    return {
      state,
      goBack,
      openStandardSubscription,
      openProSubscription,
      openExecutiveSubscription
    };
  }
};
</script>
