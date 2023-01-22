import { defineStore } from "pinia";
import { storage, db, functions } from "../firebase/init";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { nanoid } from "nanoid";
import moment from "moment";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  limit,
  startAfter
} from "firebase/firestore";
import { useAuthStore } from "./authStore";
import  { startRecording, stopRecording, cancelRecord }  from "../utils/meetingRecoder.js";

export const useMeetingStore = defineStore("useMeetingStore", {
  state: () => ({
    meetingId: null,
    audioChunks: [],
    index: 0,
    unsubscribeMeeting: null,
    meetings: {},
    meetingsDocs: {},
    meetingDuration: 0,
    nextDuration: 0,
    timeSlice: 1000 * 500, // change to n seconds
    fetchingMeetings: false,
    audio: null,
    video: null,
    audioContext: null,
    audioStreamSource: null,
    analyser: {},
    meetingTimeIntervalTicker: null
  }),
  actions: {
    async startRecording({osOfUser, systemAudioDeviceID, inputAudioDeviceID, isHeadphoneModeEnabled}) {
      self.meetingId = nanoid();
      window.electronAPI.trackEvent("start-meeting", {
        meetingId: self.meetingId
      });

      await startRecording(osOfUser, systemAudioDeviceID, inputAudioDeviceID, isHeadphoneModeEnabled, self.meetingId, self.index);
    },
    startSilenceDetection(
      stream,
      onSoundEnd = (_) => {},
      onSoundStart = (_) => {},
      silenceDelay,
      minDecibels
    ) {
      // Silence detection
      const self = this;
      const audioContext = new AudioContext();
      self.audioStreamSource = audioContext.createMediaStreamSource(stream);
      self.analyser = audioContext.createAnalyser();
      // This value should ignore background noice
      self.analyser.minDecibels = minDecibels;
      self.audioStreamSource.connect(self.analyser);

      const bufferLength = self.analyser.frequencyBinCount;
      const domainData = new Uint8Array(bufferLength);
      let silenceStart = performance.now();
      let triggered = false;

      function loop(time) {
        requestAnimationFrame(loop);
        self.analyser.getByteFrequencyData(domainData);
        self.analyser.getByteFrequencyData(domainData);
        self.analyser.getByteFrequencyData(domainData);
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
    },
    onSilence() {
      console.log("silence");
      if (this.recordStatus == "start") {
        window.electronAPI.send("notify", {
          title: "Still in the meeting?",
          body: "jamie didn't recognise speaking since 30 seconds.",
          responseChannel: "notification-summary-silence-clicked",
          silent: true
        });
      }
    },
    onSpeak() {
      console.log("speaking");
    },

    async finishRecord() {
      console.log('calling finishRecord method...');
      await stopRecording();
    },
    async cancelRecord() {
      console.log('calling cancelRecord method...');
      await cancelRecord();
    },
    async handleCapture(event, stream, triggerSource) {
      // Check if recording canceled
      if (this.recordStatus == "canceled") {
        this.stopStream(stream);
        return;
      }
      const maxMeetingDuration = 90 * 60 * 1000; // this is equal to the current technical limit of meetings (90 minutes)
      if (this.meetingDuration < maxMeetingDuration) {
        if (event.data && event.data.size > 500) {
          const type = (event.data || {}).type;
          const superBuffer = new Blob([event.data], { type });
          if (this.meetingDuration < this.nextDuration) {
            this.nextDuration += this.timeSlice;
            this.meetingDuration += this.timeSlice;
            this.uploadAudioRecording(superBuffer);
            if (this.mediaRecorder.state !== "inactive")
              this.mediaRecorder.stop();
            else this.stopStream(stream);
            if (this.recordStatus !== "stop")
              this.mediaRecorder.start(this.timeSlice);
            this.index++;
          }
        }
      } else {
        this.finishRecord();
      }
    },
    stopStream(stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
    },
    async uploadAudioRecording(recording) {
      let extension = ".mp3";

      if (recording.type === "audio/webm;codecs=opus") extension = ".webm";
      const storageRef = ref(
        storage,
        `${this.meetingId}/${this.index}_${moment().unix()}${extension}`
      );
      uploadBytes(storageRef, recording).then(() => {
        console.log("Uploaded a blob or file!");
      });
    },
    async addMeetingDoc(meetingId) {
      console.log('meeting doc exicuted..');
      this.meetingId = meetingId;
      const authStore = useAuthStore();
      const user = await authStore.getUser();
      const userRef = doc(db, "meetings", meetingId);
      const res = await setDoc(userRef, {
        title: "",
        uid: user.uid,
        createAt: Date.now(),
        from: Date.now(),
        to: Date.now(),
        status: "recording",
        chunkCount: this.index,
        processedAudioChunks: 0,
        meetingChunks: []
      });
      this.sortMeetings();
      return res;
    },
    async updateMeetingDoc(id, data) {
      const userRef = doc(db, "meetings", id);
      await updateDoc(userRef, data);
      this.meetings[id] = { ...this.meetings[id], ...data };
      this.sortMeetings();
    },
    async deleteMeetingDoc(id, recordStatusInputAudio, recordStatusSystemAudio) {
      console.log('calling deleteMeetingDoc method...');
      const authStore = useAuthStore();
      const meetingRef = doc(db, "meetings", id);
      await deleteDoc(meetingRef);
      delete this.meetings[id];
      // The following code should only be excecuted when a summary gets canceled
      const currentUser = await authStore.getUser();
      const userRef = doc(db, "accounts", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const user = userDoc.data();
      if (recordStatusInputAudio === "canceled" && recordStatusSystemAudio === "canceled") {
        await updateDoc(userRef, {
          meetingsUsedThisMonth: user.meetingsUsedThisMonth - 1
        });
      }
      window.electronAPI.trackEvent("delete-meeting", {
        meetingId: id
      });
      recordStatusInputAudio = "notRecording";
      recordStatusSystemAudio = "notRecording";
      this.sortMeetings();
    },
    sortMeetings() {
      console.log('calling sortMeetings method...');
      // convert object to array
      const meetings = Object.keys(this.meetings).map((key) => ({
        id: key,
        ...this.meetings[key]
      }));
      // sort by date
      meetings.sort((a, b) => b.createAt - a.createAt);
      // convert back to object
      this.meetings = meetings.reduce((obj, item) => {
        obj[item.id] = item;
        return obj;
      }, {});
    },
    async subscribeMeetings(uid) {
      const self = this;
      const limitRecords = 5;
      let q = query(
        collection(db, "meetings"),
        where("uid", "==", uid),
        orderBy("createAt", "desc")
      );
      // let q = query(
      //   collection(db, "meetings"),
      //   where("uid", "==", uid),
      //   orderBy("createAt", "desc"),
      //   limit(limitRecords)
      // );

      // if (this.unsubscribeMeeting) {
      //   this.unsubscribeMeeting();
      // }
      // const lastVisible =
      //   self.meetingsDocs[
      //     Object.keys(self.meetingsDocs)[
      //       Object.keys(self.meetingsDocs).length - 1
      //     ]
      //   ];
      // if (lastVisible) {
      //   q = query(
      //     collection(db, "meetings"),
      //     where("uid", "==", uid),
      //     orderBy("createAt", "desc"),
      //     startAfter(lastVisible),
      //     limit(limitRecords)
      //   );
      // }
      this.fetchingMeetings = true;
      this.unsubscribeMeeting = onSnapshot(q, (snapshot) => {
        self.fetchingMeetings = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            delete self.meetings[change.doc.id];
            // delete self.meetingsDocs[change.doc.id];
            this.sortMeetings();
          } else {
            const docData = change.doc.data();
            self.meetings[change.doc.id] = { ...docData, id: change.doc.id };
            // self.meetingsDocs[change.doc.id] = change.doc;
            this.sortMeetings();

            if (docData.status == "complete" && !docData.notificationSent) {
              window.electronAPI.send("notify", {
                title: "Summary is ready",
                body: `The summary for your meeting ${docData.title} is ready.`,
                responseChannel: "notification-summary-finished-clicked",
                meetingId: change.doc.id
              });
              self.updateMeetingDoc(change.doc.id, { notificationSent: true });
            }
          }
        });
      });
    },
    unsubscribeMeetings() {
      this.fetchingMeetings = false;
      this.unsubscribeMeeting();
    },
    // Ticks every minute to check end time for calendar event
    initIntervalTicker() {
      const self = this;
      const authStore = useAuthStore();
      this.meetingTimeIntervalTicker = setInterval(function () {
        if (self.recordStatus != "start") {
          self.closeIntervalTicker();
          return;
        }
        if (authStore.currentMeetingEndTime == null) {
          self.closeIntervalTicker();
          return;
        }
        if (authStore.currentMeetingEndTime < Date.now()) {
          window.electronAPI.send("notify", {
            title: "jamie is still recording",
            body: "Don't forget to stop jamie if your meeting is over.",
            responseChannel: "notification-meeting-ended-reminder-clicked",
            silent: true
          });
          self.closeIntervalTicker();
        }
      }, 60 * 1000); // Every minute
    },
    closeIntervalTicker() {
      const authStore = useAuthStore();
      authStore.currentMeetingEndTime = null;
      clearInterval(this.meetingTimeIntervalTicker);
      return;
    },
    async updateUserWithVersion(version) {
      let fun = httpsCallable(functions, "updateUserVersion");
      let res = await fun({ version: version });
    }
  }
});
