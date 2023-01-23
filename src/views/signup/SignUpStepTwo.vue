<template>
  <TheSignUpContainer>
    <TheTitle class="text-primary">What’s your name?</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please enter your first name
    </TheBody1>
    <TheTextInput
      class="mt-10 max-w-md"
      placeholder="Your first name"
      v-model="state.name"
      :errorMessage="state.errorMessage"
      @enter="onClickGetStarted"
    />
    <div class="flex justify-start items-center mt-16">
      <ThePrimaryButton @click="onClickGetStarted">
        Get started
      </ThePrimaryButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import TheTextInput from "../../components/inputs/TheTextInput.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores";
import { reactive } from "vue";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    TheTextInput,
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

    async function onClickGetStarted() {
      state.errorMessage = "";
      if (state.name.length > 1) {
        const currentUser = await authStore.getUser()
        await authStore.signupUpdateUserName(state.name);
        // router.push("select-subscription");
        try {
          window.electronAPI.identifyUser(currentUser.uid, { name: state.name })
          window.electronAPI.trackEvent("sign-up-entered-first-name", {
              fName: state.name
          });
        } catch(e) {}
        router.push("allow-microphone-access");
      } else {
        state.errorMessage = "Please enter valid name.";
      }
    }

    return {
      state,
      onClickGetStarted
    };
  }
};
</script>
