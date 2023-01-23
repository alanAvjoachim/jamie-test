<template>
  <TheSignUpContainer>
    <TheTitle class="text-primary">Confirm sign in</TheTitle>
    <TheBody1 class="text-secondary mt-2">
      Please enter the code we just sent you
    </TheBody1>
    <TheTextInput
      class="mt-10 max-w-md"
      placeholder="Your pincode"
      v-model="state.pin"
      :hasErrors="state.hasErrors"
      :errorMessage="state.errorMessage"
      @enter="onClickConfirm"
    />
    <div class="flex justify-start items-center mt-16">
      <ThePrimaryButton :loading="state.loading" @click="onClickConfirm"
        >Confirm</ThePrimaryButton
      >
      <ThePrimaryTextButton class="ml-6" @click="goBack">
        Back
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
import { reactive } from "vue-demi";

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
      pin: "",
      hasErrors: false,
      errorMessage: "",
      loading: false
    });

    async function onClickConfirm() {
      state.loading = true;
      state.hasErrors = false;
      state.errorMessage = "";
      if (validatePin(state.pin)) {
        const res = (await authStore.pinVerification(state.pin)).data;
        console.log(res);
        if (res.status == 200) {
          try {
            const userDetails = await authStore.getUserDetails();
            console.log(userDetails)
            window.electronAPI.identifyUser(userDetails.uid, { subscriptionType: userDetails.subType })
            window.electronAPI.trackEvent("sign-in-pincode-success", {}, res.accountId);
          } catch(e) {}
          router.push("home");
        } else {
          state.hasErrors = true;
          state.errorMessage = res.message;
        }
      } else {
        state.hasErrors = true;
        state.errorMessage = "Please enter a valid pin";
      }
      state.loading = false;
    }

    function goBack() {
      router.push("sign-in");
    }

    function validatePin(value) {
      return value.match(/^(\d{6})$/);
    }

    return {
      onClickConfirm,
      goBack,
      state
    };
  }
};
</script>
