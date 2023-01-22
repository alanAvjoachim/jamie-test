<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Connect Google</TheTitle>
    <TheTitle class="text-primary">Calendar</TheTitle>

    <div v-if="state.currentStep == 0">
      <TheBody1 class="text-secondary mt-6">
        If you have a google calendar, you can connect it with jamie so it can
        ask you whether you want a summary for the meetings you join.</TheBody1
      >
      <div class="justify-start mt-12">
        <div
          v-if="!state.loading"
          @click="onClickConnectGoogleCalendar"
          class="cursor-pointer"
        >
          <img src="/google.png" class="w-56" />
        </div>
        <ThePrimaryButton v-if="state.loading" :loading="state.loading"
          >Loading</ThePrimaryButton
        >
        <br />
        <div>
          <ThePrimaryTextButton @click="onClickSkipStep">
            <TheBody1 class="underline text-secondary mt-10">
              {{ getButtonText() }}
            </TheBody1>
          </ThePrimaryTextButton>
        </div>
      </div>
    </div>

    <div v-else-if="state.currentStep == 1">
      <TheBody1 class="text-secondary mt-6">
        We are setting up the calendar connection. One moment please...
      </TheBody1>
      <ThePrimaryTextButton @click="onClickSkipStep">
        <TheBody1 class="underline text-secondary mt-10">
          {{ getButtonText() }}
        </TheBody1>
      </ThePrimaryTextButton>
    </div>

    <div v-else-if="state.currentStep == 3">
      <TheBody1 class="text-secondary mt-6">
        Something went wrong connecting your calendar. Please try again or
        contact our support.
      </TheBody1>
      <ThePrimaryTextButton @click="onClickSkipStep">
        <TheBody1 class="underline text-secondary mt-10">
          {{ getButtonText() }}
        </TheBody1>
      </ThePrimaryTextButton>
    </div>

    <div v-if="state.connected">
      <TheBody1 class="text-secondary mt-6">
        Good job! You successfully connected your calendar to jamie.
      </TheBody1>
      <ThePrimaryTextButton @click="onClickSkipStep">
        <TheBody1 class="underline text-secondary mt-10">
          {{ getButtonText() }}
        </TheBody1>
      </ThePrimaryTextButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import { computed, reactive } from "vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import ImageButton from "../../components/buttons/ImageButton.vue";
import { useAuthStore } from "../../stores";
import { useRouter } from "vue-router";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    ThePrimaryTextButton,
    ThePrimaryButton,
    ImageButton
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      name: "",
      currentStep: 0,
      connected: computed(() => {
        if (authStore.googleTokens != null) {
          state.currentStep = 2;
          return true;
        } else return false;
      }),
      loading: false
    });

    async function onClickConnectGoogleCalendar() {
      state.loading = true;
      authStore.streamOAuthChange();
      const authUrl = await authStore.generateGoogleAuthURL();
      window.electronAPI.openGoogleOAuthUrl(authUrl);
      state.currentStep = 1;
      if (authStore.connectGoogleInSignUpFlow == true)
        authStore.connectGoogleInSignUpFlow = false;
    }

    function onClickSkipStep() {
      if (authStore.connectGoogleInSignUpFlow == true)
        authStore.connectGoogleInSignUpFlow = false;
      router.push("home");
    }

    function getButtonText() {
      if (state.currentStep == 0)
        return authStore.connectGoogleInSignUpFlow == true
          ? "Skip this step"
          : "Go back to settings";
      else if (state.currentStep == 1) return "Go back to jamie";
      else if (state.currentStep == 2) return "Continue";
      else return "Go back to settings";
    }

    return {
      state,
      onClickConnectGoogleCalendar,
      onClickSkipStep,
      getButtonText
    };
  }
};
</script>
