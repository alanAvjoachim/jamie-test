<template>
  <TheSignUpContainer :hideBg="true">
    <p class="text-secondary mb-2" @click="goBack">Go back</p>
    <TheTitle class="text-primary mb-10">Settings</TheTitle>
    <div class="grid grid-cols-3 gap-4">
        <div class="text-secondary">First name</div>
        <div v-if="state.currentUserLoaded" class="text-secondary text-white col-span-2">{{ state.currentUser.displayName }}</div>
        <div class="text-secondary">E-Mail</div>
        <div v-if="state.currentUserLoaded" class="text-secondary text-white col-span-2">{{ state.currentUser.email }}</div>
    </div>
    <div class="w-full h-px bg-gray-500 mt-10 mb-10"></div>
    <div class="grid grid-cols-3 gap-4">
        <div class="text-secondary">Calendar</div>
        <div class="text-secondary text-white col-span-2">
            <div v-if="state.googleTokensLoaded">
                <div v-if="state.googleTokens == null">Not connected</div>
                <div v-else>Connected to {{ state.googleTokens.email }}</div>
                <ThePrimaryTextButton @click="freeAccount">
                    <TheBody1 class="underline text-secondary" @click="connectGoogleCalendar">
                        {{ state.googleTokens == null ? "Set up Google calendar connection" : "Remove connection" }}
                    </TheBody1>
                </ThePrimaryTextButton>
            </div>
        </div>
        <div class="text-secondary">Plan</div>
        <div v-if="state.userDetailsLoaded" class="text-secondary text-white col-span-2">
            <div>{{ state.userDetails.subType }}</div>
            <ThePrimaryTextButton @click="freeAccount">
                <TheBody1 class="underline text-secondary" @click="switchPlans">
                    Switch plans
                </TheBody1>
            </ThePrimaryTextButton>
        </div>
    </div>
  </TheSignUpContainer>
</template>

<script>
import TheTitle from "../components/typography/TheTitle.vue";
import TheBody1 from "../components/typography/TheBody1.vue";
import TheSignUpContainer from "../components/containers/TheSignUpContainer.vue";
import { onMounted, reactive } from "vue";
import ThePrimaryTextButton from "../components/buttons/ThePrimaryTextButton.vue";
import ImageButton from "../components/buttons/ImageButton.vue";
import { useAuthStore } from "../stores";
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
    let state = reactive({
        currentUser: {},
        currentUserLoaded: false,
        userDetails: {},
        userDetailsLoaded: false,
        googleTokens: {},
        googleTokensLoaded: false
    });
    const router = useRouter();

    onMounted(async () => {
        state.currentUser = await authStore.getUser()
        state.currentUserLoaded = true
        state.googleTokens = await authStore.getGoogleTokens()
        state.googleTokensLoaded = true
        state.userDetails = await authStore.getUserDetails()
        state.userDetailsLoaded = true
    })

    function goBack() {
        router.push("home")
    }

    async function connectGoogleCalendar() {
        if(state.googleTokens == null) router.push("connect-google-calendar")
        else {
            await authStore.deleteGoogleTokens();
            state.googleTokens = await authStore.getGoogleTokens();
        }
    }

    function switchPlans() {
        router.push("select-subscription")
    }

    return {
      state,
      goBack,
      connectGoogleCalendar,
      switchPlans
    };
  }
};
</script>