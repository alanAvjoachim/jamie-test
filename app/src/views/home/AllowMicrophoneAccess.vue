<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Allow microphone</TheTitle>
    <TheTitle class="text-primary">access</TheTitle>
    <TheBody1 class="text-secondary mt-6">
      To generate summaries for your meetings, jamie</TheBody1
    >
    <TheBody1 class="text-secondary">
      needs access to your microphone.</TheBody1
    >
    <div class="flex justify-start items-center mt-12">
      <ThePrimaryButton @click="onClickGrantMicAccess">
        Grant microphone access
      </ThePrimaryButton>
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
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    ThePrimaryTextButton,
    ImageButton,
    ThePrimaryButton
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      name: "",
      loading: false,
      errorMessage: ""
    });

    async function onClickGrantMicAccess() {
      const getLocalStreamRes = await getLocalStream();
      await authStore.completeOnboarding();
      router.push("select-subscription");
    }

    async function getLocalStream() {
      let audioPermissionGranted;
      navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }

    return {
      state,
      onClickGrantMicAccess,
      authStore
    };
  }
};
</script>
  