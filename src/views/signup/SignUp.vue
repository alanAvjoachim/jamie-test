<template>
  <TheSignUpContainer>
    <TheTitle class="text-primary">Welcome!</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please enter your email to get started
    </TheBody1>
    <TheTextInput
      class="mt-10 max-w-md"
      placeholder="Your email"
      v-model="state.email"
      :errorMessage="state.errorMessage"
      @enter="onClickSignUp"
    />
    <div class="mt-4">
      <input
        type="checkbox"
        v-model="state.termsAndConditions"
        class="accent-secondary"
      />
      <TheLabel class="text-secondary ml-2"
        ><span @click="state.termsAndConditions = !state.termsAndConditions"
          >I accept the </span
        ><span @click="openTermsAndConditions" class="underline cursor-pointer"
          >terms &amp; conditions</span
        ></TheLabel
      >
    </div>
    <div class="flex justify-start items-center mt-4">
      <ThePrimaryButton
        :loading="state.loading"
        :disabled="!state.termsAndConditions"
        @click="onClickSignUp"
        >Sign Up</ThePrimaryButton
      >
      <ThePrimaryTextButton class="ml-6" @click="toSignIn">
        I already have an account
      </ThePrimaryTextButton>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheSignUpContainer from "../../components/containers/TheSignUpContainer.vue";
import TheTextInput from "../../components/inputs/TheTextInput.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores";
import TheLabel from "../../components/typography/TheLabel.vue";
import { onMounted, reactive } from "vue-demi";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    TheTextInput,
    ThePrimaryButton,
    ThePrimaryTextButton,
    TheLabel
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      email: "",
      loading: false,
      errorMessage: "",
      termsAndConditions: false
    });

    function openTermsAndConditions() {
      window.electronAPI.openTermsAndConditions();
    }
    onMounted(async () => {
      state.email = authStore.emailOnWelcomeScreen;
      const user = await authStore.getUser();
      if (user) {
        router.push("home");
      }
    });

    async function onClickSignUp() {
      state.loading = true;
      state.errorMessage = "";
      if (state.termsAndConditions) {
        if (validateEmail(state.email)) {
          const res = (await authStore.signup(state.email)).data;
          if (res.status == 200) {
            // identify call electron
            window.electronAPI.identifyUser(res.accountId, {
              email: state.email
            });
            router.push("sign-up-step-1");
          } else {
            if (res.message) {
              state.errorMessage = res.message;
            } else {
              state.errorMessage = "Error while trying to create an account";
            }
          }
        } else {
          state.errorMessage = "Please enter a valid email";
        }
      } else {
        state.errorMessage = "Please accept the terms and conditions";
      }
      state.loading = false;
    }

    function validateEmail(value) {
      return value.match(/^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,15})+$/);
    }

    function toSignIn() {
      authStore.emailOnWelcomeScreen = state.email;
      router.push("sign-in");
    }

    return {
      state,
      onClickSignUp,
      toSignIn,
      validateEmail,
      openTermsAndConditions
    };
  }
};
</script>
