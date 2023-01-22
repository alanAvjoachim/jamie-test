<template>
  <TheHomeContainer :hideBg="true">
    <div class="flex flex-col justify-center items-center h-screen pb-24">
      <TheTitle class="text-primary">New version</TheTitle>
      <TheTitle class="text-primary">available</TheTitle>
      <div class="flex flex-col justify-center items-center mt-4">
        <TheBody1 class="text-white"
          >Please download and install the new version of Jamie</TheBody1
        >
        <TheBody1 class="text-white"
          >So you can get the best experience.</TheBody1
        >
      </div>
      <div class="flex flex-col justify-center items-center mt-4">
        <ThePrimaryButton class="mt-4 w-45" @click="clickDownloadAndInstall">
          <div class="flex items-center justify-center">
            <TheBody1 class="text-background ml-3">Download & install</TheBody1>
          </div>
        </ThePrimaryButton>
      </div>
    </div>
  </TheHomeContainer>
</template>

<script>
import ThePrimaryButton from "../../components/buttons/ThePrimaryButton.vue";
import TheHomeContainer from "../../components/containers/TheHomeContainer.vue";
import TheBody1 from "../../components/typography/TheBody1.vue";
import TheTitle from "../../components/typography/TheTitle.vue";
import { onMounted } from "vue";

export default {
  components: { TheHomeContainer, ThePrimaryButton, TheTitle, TheBody1 },
  setup() {
    onMounted(async () => {
        // checkUpdateVersionAvailability();
    });
    // function checkUpdateVersionAvailability() {
    //     window.electronAPI.checkForAutoUpdates();
    // }
    function clickDownloadAndInstall() {
        window.electronAPI.downloadAutoUpdates();
    }
    return {
        // checkUpdateVersionAvailability,
        clickDownloadAndInstall
    };
  }
};
</script>

<style>
</style>