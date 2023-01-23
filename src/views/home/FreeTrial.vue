<template>
  <TheSignUpContainer :hideBg="true">
    <TheTitle class="text-primary">Free Trial</TheTitle>
    <div class="mt-14 flex items-center justify-center">
      <TheBody1 class="text-secondary font-medium text-[21px] text-center"
        >Your free trial includes up to 5 meetings and is valid for the next 7
        days.<br /><br />
        You can upgrade any time in the settings.</TheBody1
      >
    </div>
    <div class="flex justify-center items-center mt-10">
      <ThePrimaryTextButton @click="selectFreeSubscription">
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
import { reactive } from "vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores"

export default {
  components: {
    TheTitle,
    TheBody1,
    TheSignUpContainer,
    ThePrimaryTextButton
  },
  setup() {
    const state = reactive({});
    const router = useRouter();
    const authStore = useAuthStore();

    async function selectFreeSubscription() {
      //router.push("connect-google-calendar")
      router.push("home")
    }

    return {
      state,
      selectFreeSubscription
    };
  }
};
</script>
