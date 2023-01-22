<script setup>
import {reactive} from "vue";
import { nanoid } from 'nanoid'

  let audio = reactive({
    src: undefined,
    audioChunks: []
  })
  let state = reactive({
    meetingId: undefined,
    isRecording: false
  })

  function startRecord(){
    generateUniqueMeetingId();
    window.electronAPI.trackEvent("start-meeting", {
      meetingId: state.meetingId
    });
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start(2000); // every 2 seconds (for testing)
      this.mediaRecorder.ondataavailable = function(event) {
        audio.audioChunks.push(event.data);
        // trigger upload to cloud
        uploadAudioChunk(event.data)
      }
    });
  }

  function uploadAudioChunk(audioChunk) {
    const blob = new Blob(audioChunk, { type: 'audio/mp3' });

    // upload blob to server
    
  }

  function generateUniqueMeetingId() {
    state.meetingId = nanoid();
  }

  function stopRecord(){
    // const self = this
    this.mediaRecorder.stop();
    //this.mediaRecorder.addEventListener("stop", () => {
      //const audioBlob = new Blob(self.audioChunks);
      //self.recordedVoice = URL.createObjectURL(audioBlob)
    //});
    const blob = new Blob(audio.audioChunks, { type: 'audio/mp3' });
    audio.src = URL.createObjectURL(blob);
    console.log(audio.src);
    window.electronAPI.trackEvent("stop-meeting", {
      meetingId: state.meetingId
    });
  }

  function test() {
    console.log(audio)
  }
</script>

<template>
  <main>
    <h1>test</h1>
    <button @click="startRecord()">Start</button>
    <button @click="test()">test</button>
    <button @click="stopRecord()">stop</button>
    <p>{{audio.src}}</p>
  </main>
</template>
