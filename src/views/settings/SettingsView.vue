<template>
  <TheSettingsContainer>
    <ThePrimaryTextButton class="mb-2" @click="goBack">
      <div class="flex justify-start items-center text-secondary">
        <img class="w-1.5 mr-3" src="/back.png" />
        Go back
      </div>
    </ThePrimaryTextButton>
    <TheTitle class="text-primary mt-3 mb-6">Settings</TheTitle>
    <div class="grid grid-cols-3 text-white mb-2">
      <TheBody1 class="text-secondary">First name</TheBody1>
      <TheBody1>{{ getUserName() }}</TheBody1>
    </div>
    <div class="grid grid-cols-3 text-white">
      <TheBody1 class="text-secondary">E-mail</TheBody1>
      <TheBody1>{{ getUserEmail() }}</TheBody1>
    </div>

    <TheDivider class="mt-7 mb-7" />

    <div class="grid grid-cols-3 text-white mb-3">
      <TheBody1 class="text-secondary">Calendar</TheBody1>
      <div class="col-span-2">
        <TheBody1 v-if="state.googleTokens == null">Not connected</TheBody1>
        <TheBody1 v-else>Connected to {{ state.googleTokens.email }}</TheBody1>
        <ThePrimaryTextButton class="mb-2" @click="connectGoogleCalendar">
          <div class="flex justify-start items-center text-secondary underline">
            {{
              state.googleTokens == null
                ? "Set up calendar connection"
                : "Disconnect"
            }}
          </div>
        </ThePrimaryTextButton>
      </div>
    </div>
    <div class="grid grid-cols-3 text-white mb-3">
      <TheBody1 class="text-secondary">Plan</TheBody1>
      <div class="col-span-2">
        <TheBody1>{{ getUserPlan() }}</TheBody1>
        <ThePrimaryTextButton class="mb-2" @click="goToSelectPlan">
          <div class="flex justify-start items-center text-secondary underline">
            {{ getButtonText() }}
          </div>
        </ThePrimaryTextButton>
      </div>
    </div>
    <div class="grid grid-cols-3 text-white mb-6">
      <TheBody1 class="text-secondary">Summary<br/>language</TheBody1>
      <div class="col-span-2">
        <TheSelect
          v-model="state.summaryLanguage"
          :options="state.summaryLanguageOptions"
          @change="onChangeSummaryLanguage"
        />
      </div>
    </div>
    <div class="grid grid-cols-3 text-white mb-6">
      <TheBody1 class="text-secondary">Auto-start</TheBody1>
      <div class="col-span-2">
        <TheSelect
          v-model="state.autoStart"
          :options="state.autoStartOptions"
          @change="onChangeAutoStart"
        />
      </div>
    </div>
    <div class="grid grid-cols-3 text-white mb-6">
      <TheBody1 class="text-secondary">System<br />Permissions</TheBody1>
      <div class="col-span-2">
        <TheBody1>Permissions are granted ✅</TheBody1>
      </div>
    </div>
    <ThePrimaryTextButton class="mb-2" @click="signOut">
      <div class="flex justify-start items-center text-secondary underline">
        Sign out
      </div>
    </ThePrimaryTextButton>
    <ThePrimaryTextButton class="ml-3" @click="quitApp">
      <div class="flex justify-start items-center text-secondary underline">
        Quit jamie
      </div>
    </ThePrimaryTextButton>
    <div class="absolute -bottom-4 right-0 mx-11 -mb-6">
      <TheLabel class="text-secondary text-xs">
        jamie version {{ state.version }}
      </TheLabel>
    </div>
  </TheSettingsContainer>
</template>

<script>
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import TheSettingsContainer from "../../components/containers/TheSettingsContainer.vue";
import TheDivider from "../../components/dividers/TheDivider.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import { onMounted, reactive } from "vue";
import { version } from "../../../package.json";
import moment from "moment";
import TheSelect from "../../components/inputs/TheSelect.vue";

export default {
  components: {
    TheSettingsContainer,
    ThePrimaryTextButton,
    TheTitle,
    TheDivider,
    TheBody1,
    TheSelect
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    let state = reactive({
      user: {},
      userDetails: {},
      googleTokens: {},
      googleTokensLoaded: false,
      version,
      autoStart: "",
      autoStartOptions: [
        {
          name: "Enabled",
          value: "enabled"
        },
        {
          name: "Disabled",
          value: "disabled"
        }
      ],
      summaryLanguage: "",
      summaryLanguageOptions: [
        {
          name: "Language of meeting",
          value: "auto"
        },
        {
          name: "German 🇩🇪",
          value: "german"
        },
        {
          name: "English 🇬🇧/🇺🇸",
          value: "englisch"
        },
        {
          name: "Italian 🇮🇹",
          value: "italian"
        },
        {
          name: "Spanish 🇪🇸",
          value: "spanish"
        },
        {
          name: "French 🇫🇷",
          value: "french"
        },
        {
          name: "Portuguese 🇵🇹",
          value: "portuguese"
        },
        {
          name: "Dutch 🇳🇱",
          value: "dutch"
        }
      ]
    });

    onMounted(async () => {
      state.user = await authStore.getUser();
      state.userDetails = await authStore.getUserDetails();
      state.googleTokens = await authStore.getGoogleTokens();
      state.googleTokensLoaded = true;
      getAutoStart();
      if(state.userDetails.summaryLanguage == undefined) {
        await onChangeSummaryLanguage({ target: { value: "auto" }});
        state.userDetails = await authStore.getUserDetails();
        state.summaryLanguage = state.userDetails.summaryLanguage
      }
      else state.summaryLanguage = state.userDetails.summaryLanguage
    });

    function goBack() {
      router.push("home");
    }

    function getAutoStart() {
      window.electronAPI.getAutoStart();
      window.electronAPI.returnAutoStart((_event, autoStart) => {
        // console.log("returnAutoStart", autoStart);
        state.autoStart = autoStart;
      });
    }

    function goToSelectPlan() {
      // check if user already has a plan
      if (
        state.userDetails.subType == "free" ||
        state.userDetails.subType == "canceled"
      ) {
        router.push("select-plan");
      } else {
        window.electronAPI.openManageSub({
          email: state.user.email
        });
      }
    }

    function onChangeAutoStart(e) {
      // console.log(e.target.value);
      window.electronAPI.setAutoStart(e.target.value);
    }

    async function onChangeSummaryLanguage(e) {
      console.log(e)
      await authStore.changeSummaryLanguageSettings(e.target.value)
    }

    function signOut() {
      authStore.signOut();
      router.push("sign-in");
    }

    function getUserName() {
      return state.userDetails.displayName;
    }

    function getUserEmail() {
      return state.userDetails.email;
    }

    function getUserPlan() {
      if (state.userDetails && state.userDetails.subType) {
        if (
          state.userDetails.subType == "free" &&
          moment().diff(moment(state.userDetails.createdDate), "days") > 7
        ) {
          return "Free trial (expired)";
        } else {
          switch (state.userDetails.subType) {
            case "free":
              return "Free trial";
            case "canceled":
              return "Canceled";
            case "Standard Monthly":
              return "Standard monthly (24€/month)";
            case "Pro Monthly":
              return "Pro monthly (47€/month)";
            case "Executive Monthly":
              return "Executive monthly (99€/month)";
            default:
              return "Free trial";
          }
        }
      }
      return "";
    }

    function getButtonText() {
      if (
        state.userDetails.subType == "free" ||
        state.userDetails.subType == "canceled"
      ) {
        return "Upgrade to plan";
      } else {
        return "Switch plan";
      }
    }

    async function connectGoogleCalendar() {
      if (state.googleTokens == null) router.push("connect-google-calendar");
      else {
        await authStore.deleteGoogleTokens();
        state.googleTokens = await authStore.getGoogleTokens();
      }
    }

    function quitApp() {
      window.electronAPI.quitApp();
    }

    return {
      state,
      goBack,
      signOut,
      getUserName,
      getUserEmail,
      getUserPlan,
      getButtonText,
      quitApp,
      goToSelectPlan,
      connectGoogleCalendar,
      onChangeAutoStart,
      onChangeSummaryLanguage
    };
  }
};
</script>
