<template>
  <TheHomeContainer>
    <AdditionalMeetingModal
      @closeModal="closeModal"
      @startJamie="goToSummarizingFromModal"
      @goToSelectPlan="goToStripe"
      v-if="state.showAdditionalMeetingModal"
    />
    <div class="px-8 pt-8 pb-3">
      <TheTitle class="text-primary">
        {{ getGreeting() }},
        {{ state.user ? state.userDetails.displayName : "User" }}
      </TheTitle>
      <div class="flex flex-col">
        <div class="w-44" ref="tutorial1">
          <ThePrimaryButton
            class="mt-4 w-44"
            @click="goToSummarizing"
            :disabled="
              state.freeTrialState == 'quotaReached' ||
              state.freeTrialState == 'expired' ||
              state.freeTrialState == 'canceled'
            "
          >
            <div class="flex items-center justify-center">
              <img class="w-3" src="/play.png" />
              <TheBody1 class="text-background ml-3">Start jamie</TheBody1>
            </div>
          </ThePrimaryButton>
          <ThePrimaryButton
            class="mt-4 w-44"
            @click="clickSample"
          >
            <div class="flex items-center justify-center">
              <img class="w-3" src="/play.png" />
              <TheBody1 class="text-background ml-3">click version</TheBody1>
            </div>
          </ThePrimaryButton>
        </div>
        <TheLabel v-if="state.errorMessage" class="text-red-600 mt-1">{{
          state.errorMessage
        }}</TheLabel>
      </div>
      
      <div class="flex justify-end mt-9">
        <div class="text-right w-full text-secondary">
          <span ref="tutorial2">
            <TheLabel>
              {{
                state.userDetails && state.userDetails.meetingsUsedThisMonth
                  ? state.userDetails.meetingsUsedThisMonth
                  : 0
              }}/{{ state.userDetails ? state.userDetails.maxMeetings : 0 }}
              meetings used this month
            </TheLabel>
          </span>
        </div>
      </div>
    </div>
    <TheDivider />
    <div
      v-if="state.displayBanner"
      class="
        bg-primary
        h-10
        text-center
        font-semibold
        rounded-md
        items-center
        justify-center
        flex
        mx-8
        mt-4
        text-sm
      "
    >
      <div v-if="state.freeTrialState == 'quotaReached'">
        ⚠️ You have reached your free quota.
        <span @click="goToSelectPlan" class="underline cursor-pointer"
          >Select your plan</span
        >
      </div>
      <div v-if="state.freeTrialState == 'onFreeTrial'">
        ✅ You are on the free trial until {{ getFreeTrialExpireDate() }}.
      </div>
      <div v-if="state.freeTrialState == 'expired'">
        ⚠️ You don’t have an active plan.
        <span @click="goToSelectPlan" class="underline cursor-pointer"
          >Select your plan</span
        >
      </div>
      <div v-if="state.freeTrialState == 'canceled'">
        ⚠️ You have canceled your plan.
        <span @click="goToSelectPlan" class="underline cursor-pointer"
          >Select your plan</span
        >
      </div>
    </div>
    <div class="px-8 py-4 w-full">
      <TheBody1 class="text-primary f-l" style="float: left"
        >Your Meetings</TheBody1
      >
      <div>
        <ThePrimaryTextButton style="float: right">
          <div ref="tutorial3">
            <img @click="goToSettings" class="w-4" src="/settings.png" />
          </div>
        </ThePrimaryTextButton>
      </div>
      <TheLabel
        @click="sendFeedbackDialog"
        class="text-secondary"
        style="
          float: right;
          margin-right: 10px;
          font-size: 10px;
          cursor: pointer;
        "
        >Feedback?</TheLabel
      >
    </div>
    <br />

    <!-- <div class="overflow-y-auto max-h-[380px] px-8"> -->
    <MeetingList
      :meetings="state.meetings"
      v-if="Object.keys(state.meetings).length > 0"
    />
    <TheBody1 class="text-secondary text-sm ml-8" v-else>
      You not have any recordings yet.
    </TheBody1>
    <!-- </div> -->
    <div
      id="myModal"
      class="modal"
      @click.self="sendFeedbackDialog"
      style="display: block"
      v-show="state.showFeedbackModal"
    >
      <!-- Modal content -->
      <div class="modal-content">
        <div
          class="close font-bold"
          @click="sendFeedbackDialog"
          style="
            float: right;
            cursor: pointer;
            font-size: 10px;
            border: 1px solid white;
            border-radius: 50%;
            width: 17px;
            height: 17px;
            position: relative;
            padding-left: 5px;
          "
        >
          x
        </div>
        <TheBody1 class="text-xl font-bold mb-6">Share feedback</TheBody1>

        <div v-if="!state.feedbackSend">
          <TheBody1 class="text-lg font-bold mb-2"
            >What type of feedback?</TheBody1
          >
          <div class="mb-2 grid grid-cols-3">
            <button
              class="
                text-primary text-sm
                hover:text-secondary
                transform
                active:text-secondary
                transition-transform
              "
              @click="setFeedbackType('problem')"
            >
              <div class="flex flex-col justify-center items-center">
                <div
                  class="
                    bg-[#2C2C2C]
                    border
                    rounded-md
                    flex flex-col
                    justify-center
                    items-center
                    px-4
                    py-2
                    mb-2
                  "
                  :class="
                    state.feedbackType == 'problem'
                      ? 'border-[#00A3FF]'
                      : 'border-[#949494]'
                  "
                >
                  <img class="w-9" src="/warning.png" />
                  <TheBody1 class="mt-2">Problem</TheBody1>
                </div>
              </div>
            </button>
            <button
              class="
                text-primary text-sm
                hover:text-secondary
                transform
                active:text-secondary
                transition-transform
              "
              @click="setFeedbackType('idea')"
            >
              <div class="flex flex-col justify-center items-center">
                <div
                  class="
                    bg-[#2C2C2C]
                    border
                    rounded-md
                    flex flex-col
                    justify-center
                    items-center
                    px-4
                    py-2
                    mb-2
                  "
                  :class="
                    state.feedbackType == 'idea'
                      ? 'border-[#00A3FF]'
                      : 'border-[#949494]'
                  "
                >
                  <img class="w-9" src="/bulb_large.png" />
                  <TheBody1 class="mt-2">Idea</TheBody1>
                </div>
              </div>
            </button>
            <button
              class="
                text-primary text-sm
                hover:text-secondary
                transform
                active:text-secondary
                transition-transform
              "
              @click="setFeedbackType('other')"
            >
              <div class="flex flex-col justify-center items-center">
                <div
                  class="
                    bg-[#2C2C2C]
                    border
                    rounded-md
                    flex flex-col
                    justify-center
                    items-center
                    px-4
                    py-2
                    mb-2
                  "
                  :class="
                    state.feedbackType == 'other'
                      ? 'border-[#00A3FF]'
                      : 'border-[#949494]'
                  "
                >
                  <img class="w-9" src="/speech_balloon.png" />
                  <TheBody1 class="mt-2">Other</TheBody1>
                </div>
              </div>
            </button>
          </div>
          <TheTextarea
            :value="state.feedback"
            @change="state.feedback = $event"
            class="w-full"
            placeholder="Write your thoughts here…"
          ></TheTextarea>
          <!-- <textarea
            v-model="state.feedback"
            class="w-full resize-y bg-[#2C2C2C] border border-[#7E7E7E] text-primary rounded-md px-4 py-4 h-auto"
            placeholder="Write your thoughts here…"
          ></textarea> -->
          <ThePrimaryButton
            class="mt-4 w-44"
            @click="sendFeedback"
            :loading="state.feedbackLoading"
          >
            <div class="flex items-center justify-center">
              <TheBody1>Send feedback</TheBody1>
            </div>
          </ThePrimaryButton>
        </div>
        <div v-else>
          <TheBody1>Thank you for making jamie better!</TheBody1>
        </div>
      </div>
    </div>
  </TheHomeContainer>
</template>
<script>
import TheHomeContainer from "../../components/containers/TheHomeContainer.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import MeetingList from "../../components/lists/MeetingList.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import TheDivider from "../../components/dividers/TheDivider.vue";
import TheLabel from "../../components/typography/TheLabel.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import { useAuthStore, useMeetingStore } from "../../stores";
import { useRouter } from "vue-router";
import { reactive, onMounted, onUnmounted, computed, watch, ref } from "vue";
import moment from "moment";
import axios from "axios";
import TheTextarea from "../../components/inputs/TheTextarea.vue";
import TheSelect from "../../components/inputs/TheSelect.vue";
import { useShepherd } from "vue-shepherd";
import AdditionalMeetingModal from "../../components/modals/AdditionalMeetingModal.vue";
import { version } from "../../../package.json";

export default {
  components: {
    TheHomeContainer,
    TheTitle,
    MeetingList,
    TheBody1,
    ThePrimaryTextButton,
    TheDivider,
    TheLabel,
    ThePrimaryButton,
    TheTextarea,
    AdditionalMeetingModal,
    TheSelect
  },
  setup() {
    const router = useRouter();
    const meetingStore = useMeetingStore();
    const authStore = useAuthStore();

    const tutorial1 = ref(null);
    const tutorial2 = ref(null);
    const tutorial3 = ref(null);
    const tour = useShepherd({
      defaultStepOptions: {
        classes: "shepherd-custom-theme"
      },
      useModalOverlay: true
    });

    let inputDevicesArray = [];

    let state = reactive({
      meetings: computed(() => meetingStore.meetings),
      user: {},
      userDetails: computed(() => authStore.userDetails),
      errorMessage: "",
      showFeedbackModal: false,
      feedback: null,
      feedbackType: "other",
      feedbackSend: false,
      displayBanner: false,
      freeTrialState: "",
      showAdditionalMeetingModal: false,
      deviceIDInput: "",
      deviceIDOutput: "",
      inputDeviceOptions: [],
      outputDeviceOptions: [],
      osOfUser: "none",
      feedbackLoading: false,
      version
    });
    console.log(state.meetings);
    console.log("state.user");

    watch(
      () => state.userDetails,
      () => {
        checkFreeTrial();
        getDevicesList();
        // assignDefaultInputDevice();
      }
    ),
      watch(
        () => authStore.startSummaryByNotification,
        () => {
          if (authStore.startSummaryByNotification) goToSummarizing();
        }
      );

    let timerEventChecker;
    let timerEventGetter;

    onMounted(async () => {
      state.user = await authStore.getUser();
      const userDetails = await authStore.getUserDetails();
      meetingStore.subscribeMeetings(state.user.uid);
      authStore.subscribeUser(state.user.uid);

      console.log(navigator.userAgentData.platform);
      // trigger mic check + ask for permission if needed
      window.electronAPI.checkMicrophonePermissions();
      // console.log("Status of mic access: " + micAccessStatus);

      const googleTokens = await authStore.getGoogleTokens();
      if (googleTokens != null) {
        await getCalendarData();
        checkCalendarEvents();

        // Tick every 10 minutes to get new events from google calender
        timerEventGetter = setInterval(async function () {
          await getCalendarData();
        }, 10 * 60 * 1000);

        // Tick every minute to check for events
        timerEventChecker = setInterval(function () {
          checkCalendarEvents();
        }, 60 * 1000);
      }

      getOSOfUser();

      tour.addStep({
        attachTo: { element: tutorial1.value, on: "bottom-end" },
        canClickTarget: false,
        text: "You can start jamie here",
        buttons: [
          {
            action() {
              return this.next();
            },
            text: "Next"
          }
        ]
      });
      tour.addStep({
        attachTo: { element: tutorial2.value, on: "bottom-end" },
        text: "Here you can see how many meetings you used in a month",
        buttons: [
          {
            action() {
              return this.back();
            },
            classes: "shepherd-button-secondary",
            text: "Back"
          },
          {
            action() {
              return this.next();
            },
            text: "Next"
          }
        ]
      });
      tour.addStep({
        attachTo: { element: tutorial3.value, on: "bottom" },
        canClickTarget: false,
        text: "You can find all account settings right in here",
        buttons: [
          {
            action() {
              return this.back();
            },
            classes: "shepherd-button-secondary",
            text: "Back"
          },
          {
            action() {
              authStore.markTutorialAsChecked("homeView");
              return this.next();
            },
            text: "Done"
          }
        ]
      });
      if (userDetails.onboardingTutorials == undefined) tour.start();
      else {
        if (userDetails.onboardingTutorials.homeView == undefined) tour.start();
        else if (userDetails.onboardingTutorials.homeView == false)
          tour.start();
      }
      await updateUserWithVersion(userDetails);

      await checkUpdateVersionAvailability();
    });

    async function updateUserWithVersion(userDetails) {
      const updateVersion = {
        version: version
      };
      if (userDetails.version) {
        if (userDetails.version != version) {
          const sendVersionRes =
            meetingStore.updateUserWithVersion(updateVersion);
        }
      } else if (!userDetails.version) {
        const sendVersionRes =
          meetingStore.updateUserWithVersion(updateVersion);
      }
    }

    function closeModal() {
      state.showAdditionalMeetingModal = false;
    }

    // This needs to be moved to the store -> new issue
    async function getCalendarData() {
      console.log("Interval getter");
      const now = new Date();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      const calendarAPI =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
        "?timeMin=" +
        getTimeFormat(now) +
        "&timeMax=" +
        getTimeFormat(nextDay) +
        "&singleEvents=True";
      axios
        .get(calendarAPI, {
          headers: {
            authorization: `Bearer ${authStore.googleTokens.access_token}`
          }
        })
        .then(function (response) {
          const items = response.data.items;
          items.forEach((element) => {
            const time = new Date(Date.parse(element.start.dateTime));
            element.time = time.getTime();
            let alreadySaved = false;
            authStore.calendarEvents.forEach((calendarEvent) => {
              if (element.id == calendarEvent.id) alreadySaved = true;
            });
            if (!alreadySaved) authStore.calendarEvents.push(element);
          });
          console.log(authStore.calendarEvents);
        })
        .catch(function (e) {
          if (e.response.status == 401) refreshGoogleCalendarAccessToken();
        });
    }

    // This needs to be moved to the store! #ForLater
    async function refreshGoogleCalendarAccessToken() {
      const refreshURL = "https://www.googleapis.com/oauth2/v4/token";
      const requestBody = {
        client_id:
          "486965018053-bus89uuudfbn6rappva3hl9cv0bmieo9.apps.googleusercontent.com",
        client_secret: "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",
        refresh_token: authStore.googleTokens.refresh_token,
        grant_type: "refresh_token"
      };
      axios.post(refreshURL, requestBody).then(async function (response) {
        await authStore.saveRefreshedAccessToken(response.data);
      });
    }

    async function checkFreeTrial() {
      const currentUser = await authStore.getUser();
      if (state.userDetails.subType == "canceled") {
        state.displayBanner = true;
        state.freeTrialState = "canceled";
      } else if (state.userDetails.subType == "free") {
        if (
          moment().diff(
            moment(
              state.userDetails.freeTrialUntil == undefined
                ? state.userDetails.createdDate
                : state.userDetails.freeTrialUntil
            ),
            "days"
          ) > 7
        ) {
          state.displayBanner = true;
          state.freeTrialState = "expired";
        } else if (
          state.userDetails.meetingsUsedThisMonth >=
          state.userDetails.maxMeetings
        ) {
          state.displayBanner = true;
          state.freeTrialState = "quotaReached";
        } else {
          state.displayBanner = true;
          state.freeTrialState = "onFreeTrial";
        }
      } else state.freeTrial = false;
    }

    function getFreeTrialExpireDate() {
      const createdDate = moment(
        state.userDetails.freeTrialUntil == undefined
          ? state.userDetails.createdDate
          : state.userDetails.freeTrialUntil
      );
      const expireDate = createdDate.add(7, "days");
      return expireDate.format("MMM Do YYYY");
    }

    // Move to the store -> new issue
    function checkCalendarEvents() {
      console.log("Interval checker");
      const now = new Date();
      authStore.calendarEvents.forEach((element) => {
        if (element.attendees == undefined) {
          authStore.pastCalendarEvents.push(element.id);
          return;
        } else {
          if (element.attendees.length < 2) {
            authStore.pastCalendarEvents.push(element.id);
            return;
          }
          if (element.time <= now.getTime()) {
            if (authStore.pastCalendarEvents.includes(element.id)) return;
            window.electronAPI.send("notify", {
              title: "Your next meeting is right now",
              body:
                "'" +
                element.summary +
                "' has started rigth now. Click to start jamie for summarizing your meeting",
              responseChannel: "notification-meeting-started-clicked",
              eventEndTime: element.end.dateTime
            });
            authStore.pastCalendarEvents.push(element.id);
          }
        }
      });
    }

    onUnmounted(() => {
      meetingStore.unsubscribeMeetings();
      authStore.unsubscribeUser();
      clearInterval(timerEventGetter);
      clearInterval(timerEventChecker);
    });

    async function goToSummarizing() {
      authStore.startSummaryByNotification = false;
      if (
        state.userDetails.subType == "free" &&
        (
          state.userDetails.meetingsUsedThisMonth >=
            state.userDetails.maxMeetings ||
          moment(
            state.userDetails.freeTrialUntil == undefined
              ? state.userDetails.createdDate
              : state.userDetails.freeTrialUntil
          )
        ).diff(moment(), "days") > 7
      ) {
        state.errorMessage =
          "Your trial has expired. Please upgrade to a paid plan to continue using jamie.";
      } else {
        if (
          state.userDetails.meetingsUsedThisMonth >=
          state.userDetails.maxMeetings
        ) {
          state.showAdditionalMeetingModal = true;
          return;
        }
        const assignDefaultRes = await assignDefaultInputDevice();
        await meetingStore.startRecording({
          osOfUser: state.osOfUser,
          systemAudioDeviceID: state.deviceIDInput,
          inputAudioDeviceID: state.deviceIDOutput,
          isHeadphoneModeEnabled: false
        });
        router.push("summarizing");
        // toggle electron tray icon state
        window.electronAPI.toggleTrayIcon("active");
      }
    }

    function goToSummarizingFromModal() {
      state.showAdditionalMeetingModal = false;
      meetingStore.startRecording();
      router.push("summarizing");
      // toggle electron tray icon state
      window.electronAPI.toggleTrayIcon("active");
    }

    function goToSettings() {
      router.push("/settings");
    }

    function goToSelectPlan() {
      router.push("/select-plan");
    }

    function goToStripe() {
      window.electronAPI.openManageSub({
        email: state.user.email
      });
      state.showAdditionalMeetingModal = false;
    }

    function getOSOfUser() {
      if (navigator.userAgentData.platform === "macOS") state.osOfUser = "mac";
      if (navigator.userAgentData.platform === "Windows")
        state.osOfUser = "windows";
    }

    function getGreeting() {
      var today = new Date();
      var curHr = today.getHours();
      if (curHr < 12) {
        return "Good Morning";
      } else if (curHr < 18) {
        return "Good afternoon";
      } else {
        return "Good Evening";
      }
    }

    function getTimeFormat(date) {
      return (
        "" +
        date.getFullYear() +
        "-" +
        setPreNumber(date.getMonth() + 1) +
        "-" +
        setPreNumber(date.getDate()) +
        "T" +
        setPreNumber(date.getHours()) +
        ":" +
        setPreNumber(date.getMinutes()) +
        ":" +
        setPreNumber(date.getSeconds()) +
        "Z"
      );
    }

    function setPreNumber(n) {
      return n < 10 ? "0" + n.toString() : n;
    }

    var dateRegex =
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})\.?(\d{3})?(?:(?:([+-]\d{2}):?(\d{2}))|Z)?$/;
    function parseISODate(d) {
      var m = dateRegex.exec(d);
      //milliseconds are optional.
      if (m[7] === undefined) {
        m[7] = 0;
      }
      //if timezone is undefined, it must be Z or nothing (otherwise the group would have captured).
      if (m[8] === undefined && m[9] === undefined) {
        //Use UTC.
        m[8] = 0;
        m[9] = 0;
      }
      var year = +m[1];
      var month = +m[2];
      var day = +m[3];
      var hour = +m[4];
      var minute = +m[5];
      var second = +m[6];
      var msec = +m[7];
      var tzHour = +m[8];
      var tzMin = +m[9];
      var tzOffset = tzHour * 60 + tzMin;
      return new Date(
        year,
        month - 1,
        day,
        hour,
        minute - tzOffset,
        second,
        msec
      );
    }

    function sendFeedbackDialog() {
      state.showFeedbackModal = !state.showFeedbackModal;
      state.feedbackLoading = false;
      state.feedbackSend = false;
    }

    function setFeedbackType(type) {
      state.feedbackType = type;
    }

    function sendFeedback() {
      const apiURL = "https://hooks.zapier.com/hooks/catch/8243376/bplux7b/";
      state.feedbackLoading = true;
      axios
        .get(apiURL, {
          params: {
            feedback: state.feedback,
            type: state.feedbackType,
            email: state.userDetails.email
          }
        })
        .then(function (response) {
          if (response.status == 200) {
            state.feedbackSend = true;
            state.feedback = "";
          }
        })
        .finally(() => {
          state.feedbackLoading = false;
        });
    }

    async function getDevicesList() {
      const getDevicesRes = await navigator.mediaDevices.enumerateDevices();
      let audioInputArray = [];
      console.log(getDevicesRes);
      for (const audio of getDevicesRes) {
        if (audio.kind === "audioinput") {
          audioInputArray.push({
            name: audio.label,
            value: audio.deviceId,
            kind: audio.kind
          });
        } 
      }
      state.inputDeviceOptions = [];
      state.inputDeviceOptions = audioInputArray;
      inputDevicesArray = audioInputArray;
    }

    async function assignDefaultInputDevice() {
      state.deviceIDInput = inputDevicesArray[0].value;
    }

    async function checkPlatFrom() {
      window.electronAPI.getPlatfromCheck();
      window.electronAPI.returnPlatFormCheck((_event, platForm) => {
        console.log(platForm);
        state.platForm = platForm;
      });
    }

    async function clickSample() {
      router.push("new-version-available");
    }

    async function checkUpdateVersionAvailability() {
        window.electronAPI.checkForAutoUpdates();
    }
    return {
      state,
      goToSummarizing,
      goToSummarizingFromModal,
      goToSettings,
      getGreeting,
      sendFeedbackDialog,
      setFeedbackType,
      sendFeedback,
      goToSelectPlan,
      goToStripe,
      getFreeTrialExpireDate,
      closeModal,
      tutorial1,
      tutorial2,
      tutorial3,
      getDevicesList,
      assignDefaultInputDevice,
      clickSample,
      checkUpdateVersionAvailability,
      // handleScroll
      /*steps: [
        {
          target: '[data-v-step="0"]',
          content: "You can start jamie here"
        }
      ]*/
    };
  }
};
</script>
<style>
/* hide scrollbar */
::-webkit-scrollbar {
  display: none;
}

/* The Modal (background) */
.modal {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0, 0, 0); /* Fallback color */
  background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
}

/* Modal Content/Box */
.modal-content {
  border-radius: 20px;
  background-color: black;
  margin: 15% auto; /* 15% from the top and centered */
  padding: 20px;
  border: 1px solid #888;
  width: 80%; /* Could be more or less, depending on screen size */
  color: white;
}

textarea:focus {
  outline: 1px solid white;
}

.shepherd-custom-theme {
  background: rgb(70, 70, 70);
  color: white;
  margin-top: 15px !important;
}

.shepherd-arrow:before {
  background: rgb(70, 70, 70);
}

.shepherd-text {
  color: rgba(255, 255, 255, 0.75);
}

.shepherd-button {
  background: #fafafa;
  color: rgba(30, 30, 30, 0.75);
}

.shepherd-button:not(:disabled):hover {
  background: #b5b5b5;
  color: rgba(30, 30, 30, 0.75);
}

.shepherd-button.shepherd-button-secondary {
  border: none;
  background: transparent;
  color: #fafafa;
}

.shepherd-button.shepherd-button-secondary:not(:disabled):hover {
  border: none;
  background: transparent;
  color: #196fcc;
}

.the-select {
  outline: none;
}

.mic-image {
  padding-top: 6px;
}
</style>
