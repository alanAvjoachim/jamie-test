<template>
  <TheHomeContainer :hideBg="true">
    <div class="flex flex-col justify-center items-center h-screen pb-24">
      <TheTitle class="text-primary">Summarizing...</TheTitle>
      <TheBody1 class="text-secondary mt-2">
        jamie is now listening to generate a summary.
      </TheBody1>
      <ThePrimaryButton class="mt-12" @click="goToNext">
        <div class="flex items-center justify-center">
          <img class="w-3" src="/pause.png" />
          <TheBody1 class="text-background ml-3">Finish meeting</TheBody1>
        </div>
      </ThePrimaryButton>
      <ThePrimaryTextButton
        class="mt-5 text-secondary"
        @click="cancelRecord"
        v-if="state.secondsLeftForCanceling > 0"
      >
        <div class="flex items-center justify-center">
          <TheBody1 class=""
            >Cancel ({{ state.secondsLeftForCanceling }})</TheBody1
          >
        </div>
      </ThePrimaryTextButton>
    </div>
    <div
      class="
        absolute
        bottom-0
        w-full
        flex
        justify-center
        items-center
        pb-28
        text-center
      "
      
    >
    <!-- v-if="state.osOfUser === 'mac'" -->
      <TheLabel class="text-secondary pr-4">
        Are you using headphones?
      </TheLabel>
      <toggle-button
        class="z-10"
        :checked="state.checked"
        @toggleOnChange="toggleOnChange"
      />
    </div>

    <div
      class="
        absolute
        bottom-0
        w-full
        flex
        justify-center
        items-center
        p-16
        text-center
      "
    >
      <div><img class="w-2 mic-image pb-2" src="/mic.png" /></div>
      <div class="pl-1 pr-4 pb-2">
        <the-select
          v-model="state.deviceIDInput"
          :options="state.inputDeviceOptions"
          @change="onChangeDeviceSelectInput"
          class="w-40 the-select text-secondary text-sm"
        />
      </div>
      <div v-if="state.checked && state.osOfUser === 'mac'">
        <img class="w-3 mic-image pb-2" src="/headphones.png" />
      </div>
      <div class="pl-1 pb-2" v-if="state.checked && state.osOfUser === 'mac'">
        <the-select
          v-model="state.deviceIDOutput"
          :options="state.outputDeviceOptions"
          @change="onChangeDeviceSelectOutput"
          class="w-40 the-select text-secondary text-sm"
        />
      </div>
    </div>
    <div
      class="
        absolute
        bottom-0
        w-full
        flex
        justify-center
        items-center
        p-8
        text-center
      "
    >
    </div>
  </TheHomeContainer>
</template>
<script>
import TheHomeContainer from "../../components/containers/TheHomeContainer.vue";
import TheLabel from "../../components/typography/TheLabel.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import ThePrimaryTextButton from "../../components/buttons/ThePrimaryTextButton.vue";
import { useRouter } from "vue-router";
import { useMeetingStore } from "../../stores";
import { onMounted, reactive, watch } from "vue";
import TheSelect from "../../components/inputs/TheSelect.vue";
import ToggleButton from "../../components/buttons/ToggleButton.vue";

export default {
  components: {
    TheHomeContainer,
    TheLabel,
    TheTitle,
    TheBody1,
    ThePrimaryButton,
    ThePrimaryTextButton,
    TheSelect,
    ToggleButton
  },
  data: () => ({}),
  setup() {
    const router = useRouter();
    const meetingStore = useMeetingStore();

    let inputDevicesArray = [];
    let outputDevicesArray = [];

    watch(
      () => meetingStore.recordStatus,
      () => {
        if (meetingStore.recordStatus === "stop") {
          router.push("enter-name");
        }
        // getDevicesList();
      }
    );

    let state = reactive({
      cancelTimer: null,
      secondsLeftForCanceling: 45,
      inputDeviceOptions: [],
      outputDeviceOptions: [],
      checked: false,
      osOfUser: "none",
      deviceIDInput: "",
      deviceIDOutput: "",
      isHeadphoneModeEnabled: false
    });

    onMounted(() => {
      state.cancelTimer = setInterval(function () {
        state.secondsLeftForCanceling -= 1;
        if (state.secondsLeftForCanceling == 0)
          clearInterval(state.cancelTimer);
      }, 1000);
      stopMeeting();
      getDevicesList();
      getOSOfUser();
    });

    function stopMeeting() {
      window.electronAPI.stopMeeting((_event, stop) => {
        if (stop) {
          stopAndSave();
        }
      });
    }

    async function goToNext() {
      await meetingStore.finishRecord();
      router.push("enter-name");
      window.electronAPI.toggleTrayIcon("inactive");
    }

    async function stopAndSave() {
      await meetingStore.finishRecord();
      await meetingStore.updateMeetingDoc(meetingStore.meetingId, {
        title: "Meeting"
      });
      router.push("home");
      window.electronAPI.toggleTrayIcon("inactive");
    }

    async function startRecord() {
      await meetingStore.startRecording();
    }

    async function cancelRecord() {
      await meetingStore.cancelRecord();
      router.push("home");
      window.electronAPI.toggleTrayIcon("inactive");
    }

    function finishRecord() {
      meetingStore.finishRecord();
    }

    function test() {
      meetingStore.finishRecord();
    }

    function stopRecord() {
      meetingStore.finishRecord();
      router.push("home");
      window.electronAPI.toggleTrayIcon("inactive");
    }

    async function getDevicesList() {
      const getDevicesRes = await navigator.mediaDevices.enumerateDevices();
      let audioInputArray = [];
      let audioOutputArray = [];
      for (const audio of getDevicesRes) {
        if (audio.kind === "audioinput") {
          audioInputArray.push({
            name: audio.label,
            value: audio.deviceId
          });
        } else if (audio.kind === "audiooutput") {
          audioOutputArray.push({
            name: audio.label,
            value: audio.deviceId
          });
        }
      }

      state.inputDeviceOptions = [];
      state.inputDeviceOptions = audioInputArray;
      inputDevicesArray = audioInputArray;
      state.deviceIDInput = inputDevicesArray[0].value;

      state.outputDeviceOptions = [];
      state.outputDeviceOptions = audioOutputArray;
      outputDevicesArray = audioOutputArray;
      state.deviceIDOutput = outputDevicesArray[0].value;

    }

    async function toggleOnChange(value) {
      if (value) {
        state.checked = true;
        state.isHeadphoneModeEnabled = true;
        await meetingStore.cancelRecord();
        await getOSOfUser();
        await restartMeetingRecording();
      } else {
        state.checked = false;
        state.isHeadphoneModeEnabled = false;
        await meetingStore.cancelRecord();
        await getOSOfUser();
        await restartMeetingRecording();
      }
    }

    async function onChangeDeviceSelectInput(value) {
      await meetingStore.cancelRecord();
      state.deviceIDInput = value.target.value;
      await getOSOfUser();
      await restartMeetingRecording();
      console.log(state.deviceIDInput);
    }

    async function onChangeDeviceSelectOutput(value) {
      await meetingStore.cancelRecord();
      state.deviceIDOutput = value.target.value;
      await getOSOfUser();
      await restartMeetingRecording();
      console.log(state.deviceIDOutput);
    }

    async function getOSOfUser() {
      if (navigator.userAgentData.platform === "macOS") state.osOfUser = "mac";
      if (navigator.userAgentData.platform === "Windows")
        state.osOfUser = "windows";
    }

    async function restartMeetingRecording() {
      console.log(state.deviceIDInput);
      console.log(state.deviceIDOutput);
      state.secondsLeftForCanceling = 45;
      meetingStore.startRecording({
        osOfUser: state.osOfUser,
        systemAudioDeviceID: state.deviceIDInput,
        inputAudioDeviceID: state.deviceIDOutput,
        isHeadphoneModeEnabled: state.isHeadphoneModeEnabled,
      });
    }

    return {
      goToNext,
      startRecord,
      finishRecord,
      cancelRecord,
      state,
      getDevicesList,
      toggleOnChange,
      onChangeDeviceSelectInput,
      onChangeDeviceSelectOutput,
      getOSOfUser,
      restartMeetingRecording,
    };
  }
};
</script>
