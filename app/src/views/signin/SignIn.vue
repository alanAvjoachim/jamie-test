<template>
  <TheSignUpContainer>
    <TheTitle class="text-primary">Welcome Back!</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please enter your email to get started
    </TheBody1>
    <TheTextInput
      class="mt-10 max-w-md"
      placeholder="Your email"
      v-model="state.email"
      :errorMessage="state.errorMessage"
      @enter="onClickSignIn"
    />
    <div class="flex justify-start items-center mt-14">
      <ThePrimaryButton :loading="state.loading" @click="onClickSignIn">
        Sign In
      </ThePrimaryButton>
      <ThePrimaryTextButton class="ml-6" @click="toSignUp">
        I don't have an account yet
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
import { onMounted, reactive } from "vue-demi";

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    TheTextInput,
    ThePrimaryButton,
    ThePrimaryTextButton
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const state = reactive({
      email: "",
      loading: false,
      errorMessage: ""
    });

    onMounted(() => {
      state.email = authStore.emailOnWelcomeScreen;
    });

    async function onClickSignIn() {
      state.loading = true;
      state.errorMessage = "";
      if (validateEmail(state.email)) {
        const res = (await authStore.signin(state.email)).data;

        if (res.status == 200) {
          router.push("sign-in-step-1");
        } else {
          if (res.message) {
            state.errorMessage = res.message;
          } else {
            state.errorMessage = "Error while trying to sign in";
          }
        }
      } else {
        state.errorMessage = "Invalid email";
      }
      console.log(state.errorMessage);
      state.loading = false;
    }

    function validateEmail(value) {
      return value.match(/^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,15})+$/);
    }

    function toSignUp() {
      authStore.emailOnWelcomeScreen = state.email;
      router.push("/");
    }

    return {
      state,
      onClickSignIn,
      validateEmail,
      toSignUp
    };
  }
};
</script>
