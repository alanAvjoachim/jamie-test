<template>
  <TheHomeContainer :hideBg="true">
    <div class="flex flex-col justify-start px-10 pt-12 pb-3">
      <ThePrimaryTextButton class="mb-2 w-20" @click="goBack">
        <div class="flex justify-start items-center text-secondary">
          <img class="w-1.5 mr-3" src="/back.png" />
          Go Back
        </div>
      </ThePrimaryTextButton>
      <div class="flex justify-start items-center">
        <TheTitle
          v-if="!state.editing"
          @click="state.editing = true"
          class="text-primary cursor-pointer"
          >{{ state.meeting.title }}</TheTitle
        >
        <div v-if="state.editing" class="flex flex-col">
          <input
            @blur="saveTitle"
            @keyup.enter="$event.target.blur()"
            v-model="state.meeting.title"
            class="focus:outline-none bg-background placeholder:text-secondary text-primary text-3xl placeholder:font-semibold font-semibold"
          />
          <div class="border-2 border-secondary mt-3"></div>
        </div>
        <ThePrimaryTextButton class="ml-4" @click="copyToClipboard">
          <div ref="tutorial2">
            <img class="w-3" src="/copy.png" />
          </div>
        </ThePrimaryTextButton>
        <div
          v-if="state.showNotification"
          class="bg-accent ml-3 h-8 px-3 flex items-center w-auto text-primary border border-[#7E7E7E] rounded-md"
        >
          <TheLabel>Summary copied to clipboard!</TheLabel>
        </div>
      </div>
      <TheLabel class="text-secondary mt-2">
        {{ humanizeToDateFromUnix(state.meeting.createAt) }} at
        {{ unixToTime(state.meeting.from) }} -
        {{ unixToTime(state.meeting.to) }}
      </TheLabel>
      <div ref="tutorial1" class="mt-8">
        <TheTipTap
          v-model="state.summary"
          placeholder="Summary in progress..."
          @change="summaryChange"
        />
      </div>
      <div
        class="flex flex-col"
        v-if="
          state.meeting.ratingStatus !== 'rated' &&
          state.meeting.ratingStatus !== 'thanked'
        "
      >
        <div ref="tutorial3">
          <TheRating
            class="mt-8"
            label="Rate the summary"
            v-model="state.ratingAmount"
            @change="onRatingChange"
          />
        </div>
        <TheTextarea
          class="mt-2"
          placeholder="Your feedback here..."
          rows="1"
          v-if="state.ratingAmount >= 1 && state.ratingAmount <= 3"
          v-model="state.ratingComment"
        />
        <ThePrimaryButton
          class="w-36 mt-4 self-end"
          v-if="state.ratingAmount >= 1 && state.ratingAmount <= 3"
          :loading="state.loadingComment"
          @click="saveRating"
        >
          Send feedback
        </ThePrimaryButton>
      </div>
      <TheBody1
        class="text-primary text-center mt-8"
        v-else-if="state.meeting.ratingStatus === 'thanked'"
      >
        Thanks! This helps us make jamie better for you.
      </TheBody1>
      <div class="mt-10">
        <ThePrimaryTextButton class="mb-2" @click="deleteSummary">
          <div class="text-[#7E7E7E] underline">Delete summary</div>
        </ThePrimaryTextButton>
      </div>
    </div>
  </TheHomeContainer>
</template>
<script>
import moment from "moment";
import TheHomeContainer from "../../components/containers/TheHomeContainer.vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import TheLabel from "../../components/typography/TheLabel.vue";
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMeetingStore, useAuthStore } from "../../stores";
import TheTipTap from "../../components/inputs/TheTipTap.vue";
import TheRating from "../../components/inputs/TheRating.vue";
import TheTextarea from "../../components/inputs/TheTextarea.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import { useShepherd } from "vue-shepherd";

export default {
  components: {
    TheHomeContainer,
    ThePrimaryTextButton,
    TheTitle,
    TheLabel,
    TheTipTap,
    TheRating,
    TheTextarea,
    ThePrimaryButton,
    TheBody1
  },
  setup() {
    const route = useRoute();
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

    let state = reactive({
      meeting: {},
      summary: "",
      timeout: 0,
      ratingAmount: 0,
      ratingComment: null,
      loadingComment: false,
      requestSent: false,
      editing: false,
      showNotification: false
    });

    onMounted(async () => {
      if (route.params.id && meetingStore.meetings[route.params.id]) {
        state.meeting = meetingStore.meetings[route.params.id];
        console.log("subscribe", state.meeting, route.params.id);
        state.summary = meetingStore.meetings[route.params.id].summary;

        try {
          window.electronAPI.trackEvent("summary-viewed", {
            meetingId: state.meeting
          });
        } catch (e) {}
      }
      const userDetails = await authStore.getUserDetails();

      tour.addStep({
        attachTo: { element: tutorial1.value, on: "top" },
        canClickTarget: false,
        text: "You can edit a summary right after a meeting in here.",
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
        text: "You can copy-and-past the summary into another software.",
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
        attachTo: { element: tutorial3.value, on: "top" },
        canClickTarget: false,
        scrollTo: true,
        classes: "custom-step",
        text: "You can rate the summary here. This helps us make the summaries better for you over time.",
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
              authStore.markTutorialAsChecked("detailView");
              return this.next();
            },
            text: "Done"
          }
        ]
      });
      if (userDetails.onboardingTutorials == undefined) tour.start();
      else {
        if (userDetails.onboardingTutorials.detailView == undefined)
          tour.start();
        else if (userDetails.onboardingTutorials.detailView == false)
          tour.start();
      }
    });

    function humanizeToDateFromUnix(timestamp) {
      const date = moment(timestamp);

      if (date.isSame(new Date(), "day")) {
        return "Today";
      } else if (date.isSame(new Date(), "week")) {
        return date.format("dddd");
      } else if (date.isSame(new Date(), "year")) {
        return date.format("MMMM Do");
      } else {
        return date.format("MMMM Do YYYY");
      }
    }

    function unixToTime(timestamp) {
      return moment(timestamp).format("HH:mm");
    }

    async function saveTitle() {
      if (state.meeting.title.length > 0) {
        state.editing = false;
        await meetingStore.updateMeetingDoc(state.meeting.id, {
          title: state.meeting.title
        });
      }
    }

    async function goBack() {
      if (route.params.id && meetingStore.meetings[route.params.id]) {
        await updateSummary();
      }
      router.push("/home");
    }

    async function updateSummary() {
      try {
        if (route.params.id && meetingStore.meetings[route.params.id]) {
          console.log(state.summary);
          await meetingStore.updateMeetingDoc(state.meeting.id, {
            summary: state.summary
          });
          meetingStore.meetings[route.params.id].summary = state.summary;
          try {
            window.electronAPI.trackEvent("summary-adjusted", {
              meetingId: meetingStore.meetings[route.params.id]
            });
          } catch (e) {}
        }
      } catch (e) {
        console.error(e);
      }
    }

    function deleteSummary() {
      meetingStore.deleteMeetingDoc(state.meeting.id);
      router.push("/home");
    }

    function copyToClipboard() {
      window.electronAPI.copyToClipboard({
        copy: state.summary
      });
      state.showNotification = true;
      setTimeout(() => {
        state.showNotification = false;
      }, 3000);
    }

    async function summaryChange() {
      if (state.timeout >= 0) {
        clearTimeout(state.timeout);
      }
      state.timeout = setTimeout(() => {
        updateSummary();
      }, 15000);
    }

    async function saveRating() {
      state.loadingComment = true;
      await meetingStore.updateMeetingDoc(state.meeting.id, {
        ratingAmount: state.ratingAmount,
        // if the rating is above 3, make the comment null
        ratingComment:
          state.ratingAmount > 3 && state.ratingAmount <= 5
            ? null
            : state.ratingComment,
        // ratingComment: state.ratingComment,
        ratingStatus: "rated"
      });
      state.loadingComment = false;
      meetingStore.meetings[route.params.id].ratingAmount = state.ratingAmount;
      meetingStore.meetings[route.params.id].ratingComment =
        state.ratingComment;
      meetingStore.meetings[route.params.id].ratingStatus = "thanked";
      state.meeting = meetingStore.meetings[route.params.id];

      window.electronAPI.trackEvent("summary-rated", {
        rating: state.ratingAmount,
        comment: state.ratingComment
      });
    }

    function onRatingChange() {
      if (
        state.ratingAmount > 3 &&
        state.ratingAmount <= 5 &&
        !state.requestSent
      ) {
        state.requestSent = true;
        saveRating();
      }
    }

    return {
      state,
      humanizeToDateFromUnix,
      unixToTime,
      goBack,
      updateSummary,
      deleteSummary,
      copyToClipboard,
      summaryChange,
      saveRating,
      onRatingChange,
      tutorial1,
      tutorial2,
      tutorial3,
      saveTitle
    };
  }
};
</script>
<style>
.shepherd-custom-theme {
  background: rgb(70, 70, 70);
  color: white;
  margin-top: 15px !important;
  margin-bottom: 15px !important;
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
.custom-step {
  margin-bottom: -15px !important;
}
</style>
