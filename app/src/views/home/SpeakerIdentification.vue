<template>
  <TheSettingsContainer>
    <ThePrimaryTextButton class="mb-2" @click="goBack">
      <div class="flex justify-start items-center text-secondary">
        <img class="w-1.5 mr-3" src="/back.png" />
        Go back
      </div>
    </ThePrimaryTextButton>
    <TheTitle class="text-primary mb-5">Who’s who?</TheTitle>
    <SpeakerItem
      v-for="(speaker, index) in state.speakers"
      :key="index"
      :speakers="speaker"
      :placeholder="'Speaker ' + (index + 1)"
    />
    <div class="grid grid-cols-2">
      <div></div>
      <div>
        <ThePrimaryButton class="mt-16 w-52" @click="goToSummary">
          <div class="flex items-center justify-center">
            <TheBody1 class="text-background ml-3"
              >Continue to summary</TheBody1
            >
          </div>
        </ThePrimaryButton>
      </div>
    </div>
  </TheSettingsContainer>
</template>

<script>
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import TheSettingsContainer from "../../components/containers/TheSettingsContainer.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import ImageButton from "../../components/buttons/ImageButton.vue";
import router from "../../router";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import TheTextInput from "../../components/inputs/TheTextInput.vue";
import { onMounted, reactive } from "vue";
import { useMeetingStore } from "../../stores";
import { useRoute } from "vue-router";
import SpeakerItem from "../../components/items/SpeakerItem.vue";

export default {
  components: {
    TheSettingsContainer,
    ThePrimaryTextButton,
    TheTitle,
    TheBody1,
    ImageButton,
    ThePrimaryButton,
    TheTextInput,
    SpeakerItem
  },
  setup() {
    const meetingStore = useMeetingStore();
    const route = useRoute();

    let state = reactive({
      meeting: {},
      speakers: []
    });

    onMounted(async () => {
      if (route.params.id && meetingStore.meetings[route.params.id]) {
        state.meeting = meetingStore.meetings[route.params.id];
        convertAudioLinks(state.meeting.identifiedSpeakerLibrary);
      }
    });

    const convertAudioLinks = (data) => {
      state.speakers = [];
      for (const audio in data) {
        state.speakers.push({
          name: data[audio].name ? data[audio].name : "",
          file: new Audio(data[audio].audio),
          isPlaying: false,
          audio: data[audio].audio
        });
      }
    };

    const replaceSpeakerNames = (speakers, summary) => {
      for (let i = 0; i < speakers.length; i++) {
        let speakerRegex = new RegExp("Speaker_" + i, "g");
        summary = summary.replace(speakerRegex, speakers[i].name);
      }
      return summary;
    };

    const goToSummary = async () => {
      for (let i = 0; i < state.speakers.length; i++) {
        if (state.speakers[i].name === "") {
          state.speakers[i].name = "Speaker " + (i + 1);
        }
      }
      // if (state.speakers.every((speaker) => speaker.name !== "")) {
      let speakers = state.speakers.map((speaker) => {
        return {
          name: speaker.name,
          audio: speaker.audio
        };
      });

      state.meeting.summary = replaceSpeakerNames(
        speakers,
        state.meeting.summary
      );

      await meetingStore.updateMeetingDoc(route.params.id, {
        status: "complete",
        identifiedSpeakerLibrary: speakers,
        summary: state.meeting.summary
      });
      router.push(`/meeting-details/${route.params.id}`);
      // }
    };
    const goBack = () => {
      router.push("/home");
    };
    return {
      state,
      goToSummary,
      goBack,
      convertAudioLinks
    };
  }
};
</script>
