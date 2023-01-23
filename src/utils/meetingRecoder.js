// all the logic to record the meeting should live in here

import { functions } from "../firebase/init";
import { useAuthStore } from "../stores/authStore";
import { useMeetingStore } from "../stores/meetingStore";
import { httpsCallable } from "firebase/functions";

let meetingId = "";
let index = 0;
let systemAudioRecorder = null;
let inputAudioRecorder = null;
let timeSlice = 1000 * 50 ; // change to n seconds
let meetingDuration = 0;
let nextDuration = 0;
let recordStatusInputAudio = "stop";
let recordStatusSystemAudio = "stop";
let inputAudioBase64String = "";
let systemAudioBase64String = "";
let audioStreamSource = null;
let analyser = {};
let tempFilesDir = [];
let headphoneModeEnabled = false;
let userOperationSystem = "";

// export async function startRecording(osOfUser: string, headphoneMode: boolean) {
export async function startRecording(
  osOfUser,
  systemAudioDeviceID,
  inputAudioDeviceID,
  isHeadphoneModeEnabled,
  meetingID,
  index
) {
  console.log("calling startRecording method...");
  const meetingStore = useMeetingStore();
  const authStore = useAuthStore();
  await authStore.getUserDetails();

  meetingId = meetingID;
  systemAudioRecorder = null;
  inputAudioRecorder = null;
  index = index;
  meetingDuration = 0;
  nextDuration = timeSlice;
  recordStatusSystemAudio = "start";
  recordStatusInputAudio = "start";
  headphoneModeEnabled = isHeadphoneModeEnabled;

  if (osOfUser === "mac") {
    userOperationSystem = osOfUser;
    if (isHeadphoneModeEnabled) {
      await startInputAudioRecording(inputAudioDeviceID);
    } else if (!isHeadphoneModeEnabled) {
      await startInputAudioRecording(systemAudioDeviceID);
    }
  } else if (osOfUser === "windows") {
    userOperationSystem = osOfUser;
    if (isHeadphoneModeEnabled) {
      await startSystemAudioRecording(systemAudioDeviceID);
      await startInputAudioRecording(inputAudioDeviceID);
    } else if (!isHeadphoneModeEnabled) {
      await startInputAudioRecording(systemAudioDeviceID);
    }
  }

  await meetingStore.addMeetingDoc(meetingId);
}

export async function startSilenceDetection(
  stream,
  onSoundEnd = (_) => {},
  onSoundStart = (_) => {},
  silenceDelay,
  minDecibels
) {
  // Silence detection
  const self = this;
  const audioContext = new AudioContext();
  audioStreamSource = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  // This value should ignore background noice
  analyser.minDecibels = minDecibels;
  audioStreamSource.connect(self.analyser);

  const bufferLength = self.analyser.frequencyBinCount;
  const domainData = new Uint8Array(bufferLength);
  let silenceStart = performance.now();
  let triggered = false;

  function loop(time) {
    requestAnimationFrame(loop);
    analyser.getByteFrequencyData(domainData);
    analyser.getByteFrequencyData(domainData);
    analyser.getByteFrequencyData(domainData);
    if (domainData.some((v) => v)) {
      if (triggered) {
        triggered = false;
        onSoundStart();
      }
      silenceStart = time;
    }
    if (!triggered && time - silenceStart > silenceDelay) {
      onSoundEnd();
      triggered = true;
    }
  }
  loop(performance.now());
}
// // also silence detection should be moved here

export async function stopRecording() {
  if (headphoneModeEnabled) {
    console.log("calling stopRecording method...");
    const meetingStore = useMeetingStore();
    // this function should handle the stop of the recording
    // all media stream shall be handled in here
    if (systemAudioRecorder.state !== "inactive") systemAudioRecorder.stop();
    if (inputAudioRecorder.state !== "inactive") inputAudioRecorder.stop();
    recordStatusSystemAudio = "stop";
    recordStatusInputAudio = "stop";
    meetingStore.updateMeetingDoc(meetingId, {
      to: Date.now(),
      status: "transcribing",
      duration: meetingDuration,
      chunkCount: index + 1
    });
    window.electronAPI.trackEvent("stop-meeting", {
      meetingId: meetingId,
      duration: meetingDuration
    });
  } else if (!headphoneModeEnabled) {
    console.log("calling stopRecording method...");
    const meetingStore = useMeetingStore();
    // this function should handle the stop of the recording
    // all media stream shall be handled in here
    if (inputAudioRecorder.state !== "inactive") inputAudioRecorder.stop();
    recordStatusInputAudio = "stop";
    meetingStore.updateMeetingDoc(meetingId, {
      to: Date.now(),
      status: "transcribing",
      duration: meetingDuration,
      chunkCount: index + 1
    });
    window.electronAPI.trackEvent("stop-meeting", {
      meetingId: meetingId,
      duration: meetingDuration
    });
  }
}

// // the uploading of chunks should be handled in the meeting store
// // but be triggered from here
// // and also, the retry mechnaism should be handled here

export async function startSystemAudioRecording(deviceID) {
  console.log("calling startSystemAudioRecording method...");
  const stream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "desktop",
          deviceId: deviceID
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          minWidth: 640,
          maxWidth: 640,
          minHeight: 360,
          maxHeight: 360
        }
      }
    })
    .then((stream) => {
      systemAudioRecorder = new MediaRecorder(stream);
      systemAudioRecorder.start(timeSlice);
      systemAudioRecorder.onstop = handleCaptureSystemAudio;
      systemAudioRecorder.ondataavailable = handleCaptureSystemAudio;
    });
}

export async function startInputAudioRecording(deviceID) {
  console.log("calling startInputAudioRecording method...");
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        deviceId: deviceID
      },
      video: false
    })
    .then((stream) => {
      inputAudioRecorder = new MediaRecorder(stream);
      inputAudioRecorder.start(timeSlice);
      inputAudioRecorder.onstop = handleCaptureInputAudio;
      inputAudioRecorder.ondataavailable = handleCaptureInputAudio;
    });
}

export async function handleCaptureSystemAudio(event) {
  console.log("calling handleCaptureSystemAudio method...");
  if (recordStatusSystemAudio != "canceled") {
    const maxMeetingDuration = 80 * 60 * 1000; // this is equal to the current technical limit of meetings (80 minutes)
    if (meetingDuration < maxMeetingDuration) {
      if (event.data && event.data.size > 5000) {
        const type = (event.data || {}).type;
        const superBuffer = new Blob([event.data], { type });
        if (meetingDuration < nextDuration) {
          nextDuration += timeSlice;
          meetingDuration += timeSlice;
          uploadSystemAudioRecording(superBuffer);
          if (systemAudioRecorder.state !== "inactive")
            systemAudioRecorder.stop();
          if (recordStatusSystemAudio !== "stop")
            systemAudioRecorder.start(timeSlice);
        }
      }
    } else {
      stopRecording();
    }
  }
}

export async function handleCaptureInputAudio(event) {
  console.log("calling handleCaptureInputAudio method...");
  if (recordStatusInputAudio != "canceled") {
    const maxMeetingDuration = 80 * 60 * 1000; // this is equal to the current technical limit of meetings (80 minutes)
    if (meetingDuration < maxMeetingDuration) {
      if (event.data && event.data.size > 500) {
        const type = (event.data || {}).type;
        const superBuffer = new Blob([event.data], { type });
        if (meetingDuration < nextDuration) {
          nextDuration += timeSlice;
          meetingDuration += timeSlice;
          uploadInputAudioRecording(superBuffer);
          if (inputAudioRecorder.state !== "inactive")
            inputAudioRecorder.stop();
          if (recordStatusInputAudio !== "stop")
            inputAudioRecorder.start(timeSlice);
        }
      }
    } else {
      stopRecording();
    }
  }
}

export async function uploadSystemAudioRecording(recording) {
  console.log("calling uploadSystemAudioRecording method...");
  var offlineAudioContext = new OfflineAudioContext(2, 44100 * 100, 44100);
  var soundSource = offlineAudioContext.createBufferSource();
  const audioContext = new AudioContext();
  let myBuffer;
  let audioRenderedBuffer;
  let base64String = "";
  var reader = new FileReader();
  var reader1 = new FileReader();
  reader.readAsArrayBuffer(recording);
  const audioBufferRes = await new Promise(async (resolve, reject) => {
    reader.onload = async function () {
      var videoFileAsBuffer = reader.result;
      audioContext
        .decodeAudioData(videoFileAsBuffer)
        .then(async function (decodedAudioData) {
          myBuffer = decodedAudioData;
          soundSource.buffer = myBuffer;
          soundSource.connect(offlineAudioContext.destination);
          soundSource.start();

          offlineAudioContext.startRendering().then(function (renderedBuffer) {
            console.log(renderedBuffer);
            resolve(renderedBuffer);
            audioRenderedBuffer = renderedBuffer;
          });
        });
    };
  });

  if (audioBufferRes) {
    reader1.readAsDataURL(recording);
    const res1 = await new Promise(async (resolve, reject) => {
      reader1.onloadend = async function () {
        base64String = reader1.result;
        console.log("videoBase64String", base64String);
        // const a = base64String.slice(46);
        const a = base64String.slice(39);
        resolve(a);
      };
    });
    console.log("videoBase64String res1", res1);
    systemAudioBase64String = res1;
  }
  sendToRetry();
}

export async function uploadInputAudioRecording(recording) {
  console.log("calling uploadInputAudioRecording method...");
  var reader = new FileReader();
  reader.readAsDataURL(recording);
  const res1 = await new Promise(async (resolve, reject) => {
    reader.onload = async () => {
      const readerResult = reader.result.split(",");
      const readerReusultIndexOne = readerResult[1];
      resolve(readerReusultIndexOne);
    };
  });
  console.log("audioBase64String res1", res1);
  inputAudioBase64String = res1;
  sendToRetry();
}

export async function sendFileToServer() {
  console.log("calling sendFIletoserver method...");
  tempFilesDir = [];
  if (headphoneModeEnabled) {
    if (inputAudioBase64String && systemAudioBase64String) {
      tempFilesDir.push({
        audioBase64String: inputAudioBase64String,
        videoBase64String: systemAudioBase64String,
        meetingId: meetingId,
        index: index
      });

      for (const indexFile of tempFilesDir) {
        startUploading(indexFile);
      }
      index++;
      inputAudioBase64String = "";
      systemAudioBase64String = "";
    } else {
      console.log("None");
    }
  } else if (!headphoneModeEnabled) {
    if (inputAudioBase64String) {
      tempFilesDir.push({
        audioBase64String: inputAudioBase64String,
        videoBase64String: "",
        meetingId: meetingId,
        index: index
      });

      for (const indexFile of tempFilesDir) {
        startUploading(indexFile);
      }
      index++;
      inputAudioBase64String = "";
      systemAudioBase64String = "";
    }
  }
}

export async function startUploading(chunk) {
  console.log("calling startUploading method...");
  const res = await uploading(chunk);
  if (res) {
    const updatedArr = tempFilesDir.filter(
      (obj) => obj.index != res.data.index
    );
    tempFilesDir = updatedArr;
  }
}

export async function uploading(chunk) {
  console.log("calling uploading method...");
  try {
    let fun = httpsCallable(functions, "audio-handleAudioFilesFromElectronApp");
    const res = await fun({
      audioBase64String: inputAudioBase64String,
      videoBase64String: systemAudioBase64String,
      meetingId: meetingId,
      index: index
    });
    if (res.data.code === 200) {
      return res;
    }
  } catch (error) {
    uploading(chunk);
    console.error(error);
  }
}

export async function waitForM(milliseconds) {
  console.log("calling waitForM method...");
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function retry(promise, onRetry, maxRetries) {
  console.log("calling retry method...");
  async function retryWithBackoff(retries) {
    try {
      if (retries > 0) {
        const timeToWait = 2 ** retries * 100;
        console.log(`waiting for ${timeToWait}ms...`);
        self.waitForM(timeToWait);
      }
      return await promise;
    } catch (e) {
      if (retries < maxRetries) {
        onRetry;
        return retryWithBackoff(retries + 1);
      } else {
        console.warn("Max retries reached. Bubbling the error up");
        throw e;
      }
    }
  }
  return retryWithBackoff(0);
}

export async function sendToRetry() {
  console.log("calling sendToRetry method...");
  const apiCall = sendFileToServer();
  await retry(
    apiCall,
    () => {
      console.log("onRetry called...");
    },
    4
  );
}

export async function cancelRecord() {
  console.log("calling cancelRecord method...");
  const meetingStore = useMeetingStore();
  if (headphoneModeEnabled) {
    recordStatusInputAudio = "canceled";
    recordStatusSystemAudio = "canceled";
    systemAudioRecorder.stop();
    inputAudioRecorder.stop();
  } else if (!headphoneModeEnabled) {
    recordStatusInputAudio = "canceled";
    recordStatusSystemAudio = "canceled";
    inputAudioRecorder.stop();
  }
  try {
    await meetingStore.deleteMeetingDoc(
      meetingId,
      recordStatusInputAudio,
      recordStatusSystemAudio
    );
  } catch (e) {
    console.log(e);
  }
}
