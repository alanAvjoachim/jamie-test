<script setup>
import { onMounted } from "vue-demi";
import { RouterView } from "vue-router";
import { useAuthStore } from "./stores";

const authStore = useAuthStore();

onMounted(() => {
  authStore.registerMessageReciever();
  console.log("MessageReciever registered");
  checkEventUpdateDownloadFunction();
  checkForMajorVersionUpdateFunction();
});

function checkEventUpdateDownloadFunction() {
  window.electronAPI.checkEventUpdateDownload();
}

function checkForMajorVersionUpdateFunction() {
  window.electronAPI.checkForMajorVersionUpdate();
  window.electronAPI.notifyMajorUpdateCompletion((_event, updateStatus) => {
    if (updateStatus) {
      router.push("new-version-available");
    }
  });
}
</script>

<template>
  <RouterView />
</template>

<style>
body {
  background: black;
  user-select: none;
}
</style>