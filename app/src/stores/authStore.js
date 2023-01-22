import { defineStore } from "pinia";
import { functions, db, auth } from "../firebase/init";
import { httpsCallable } from "firebase/functions";
import {
  signInWithCustomToken,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { useMeetingStore } from "./meetingStore";

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    email: "",
    emailOnWelcomeScreen: "",
    userDetails: null,
    googleTokens: null,
    calendarEvents: [],
    pastCalendarEvents: [],
    connectGoogleInSignUpFlow: true,
    notificationRecieverRegistrated: false,
    startSummaryByNotification: false,
    currentMeetingEndTime: null,
    offline: false,
    offlineInterval: null
  }),
  actions: {
    async signup(email) {
      let fun = httpsCallable(functions, "auth-signUp");
      let res = await fun({ email });
      if (res.data.status == 200) this.email = email;
      this.registerMessageReciever();
      return res;
    },
    async pinVerification(pin) {
      let fun = httpsCallable(functions, "auth-verifyPin");
      let res = await fun({ pin, email: this.email });
      if (res.data.status == 200)
        await signInWithCustomToken(auth, res.data.token);
      return res;
    },
    async signupUpdateUserName(name) {
      const currentUser = await this.getUser();
      await updateProfile(currentUser, { displayName: name });
      const accountRef = doc(db, "accounts", currentUser.uid);
      await updateDoc(accountRef, { displayName: name });
    },
    async signin(email) {
      let fun = httpsCallable(functions, "auth-signIn");
      let res = await fun({ email });
      if (res.data.status == 200) this.email = email;
      this.registerMessageReciever();
      return res;
    },
    async signOut() {
      const meetingStore = useMeetingStore();
      meetingStore.meetings = {};
      this.email = "";
      this.userDetails = null;
      await auth.signOut();
      window.electronAPI.clearStore();
    },
    async completeOnboarding() {
      const currentUser = await this.getUser();
      const userRef = doc(db, "accounts", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const user = userDoc.data();
      await updateDoc(userRef, {
        onboardingComplete: true
      });
    },
    async changeSummaryLanguageSettings(language) {
      const currentUser = await this.getUser();
      const userRef = doc(db, "accounts", currentUser.uid);
      await updateDoc(userRef, {
        summaryLanguage: language
      });
    },
    async generateGoogleAuthURL() {
      const currentUser = await this.getUser();
      let fun = httpsCallable(functions, "auth-generateAuthUrl");
      let res = await fun({ userId: currentUser.uid });
      return res.data.authUrl;
    },

    async streamOAuthChange() {
      const currentUser = await this.getUser();
      const path = "accounts/" + currentUser.uid + "/private";
      const unsubscribe = onSnapshot(doc(db, path, "googleTokens"), (doc) => {
        this.googleTokens = doc.data();
        if (doc.data() != undefined) unsubscribe();
      });
    },

    async getUser() {
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            unsubscribe();
            resolve(user);
          },
          reject
        );
      });
    },
    async markTutorialAsChecked(tutorialId) {
      console.log(tutorialId);
      const userInfo = await this.getUser();
      const userRef = doc(db, "accounts", userInfo.uid);
      const userDoc = await getDoc(userRef);
      const user = userDoc.data();
      let onboardingTutorials =
        user.onboardingTutorials == undefined ? {} : user.onboardingTutorials;
      onboardingTutorials[tutorialId] = true;
      await updateDoc(userRef, { onboardingTutorials: onboardingTutorials });
    },
    async getUserDetails() {
      const currentUser = await this.getUser();
      const userRef = doc(db, "accounts", currentUser.uid);
      const userData = await getDoc(userRef);

      if (userData.exists()) {
        this.userDetails = { ...userData.data(), uid: currentUser.uid };
        return this.userDetails;
      } else return null;
    },
    async getGoogleTokens() {
      const currentUser = await this.getUser();
      const path = "accounts/" + currentUser.uid + "/private";
      const tokenRef = doc(db, path, "googleTokens");
      const tokenData = await getDoc(tokenRef);

      if (tokenData.exists()) this.googleTokens = tokenData.data();
      else this.googleTokens = null;
      return this.googleTokens;
    },
    async deleteGoogleTokens() {
      const currentUser = await this.getUser();
      const path = "accounts/" + currentUser.uid + "/private/";
      const tokenRef = doc(db, path, "googleTokens");
      await deleteDoc(tokenRef);
      // Reset state
      this.googleTokens = null;
      this.calendarEvents = [];
      this.pastCalendarEvents = [];
    },
    subscribeUser(uid) {
      const self = this;
      this.unsubscribeUser = onSnapshot(doc(db, "accounts", uid), (doc) => {
        self.userDetails = doc.data();
      });
    },
    unsubscribeUser() {
      this.unsubscribeUser();
    },
    async offlineDetection() {
      try {
        await fetch("https://www.google.com", { mode: "no-cors" });
        this.offline = false;
        console.log(this.offlineInterval);
      } catch (e) {
        this.offline = true;
      }
    },
    runOfflineDetection() {
      this.offlineInterval = setInterval(() => {
        this.offlineDetection();
      }, 50 * 1000);
    },
    stopOfflineDetection() {
      clearInterval(this.offlineInterval);
    },
    async saveRefreshedAccessToken(refreshedToken) {
      const currentUser = await this.getUser();
      const path = "accounts/" + currentUser.uid + "/private";
      const tokenRef = doc(db, path, "googleTokens");
      await updateDoc(tokenRef, {
        access_token: refreshedToken.access_token
      });
    },
    registerMessageReciever() {
      const meetingStore = useMeetingStore();
      // Summary
      window.electronAPI.receive(
        "notification-summary-finished-clicked",
        (data) => {
          if (meetingStore.recordStatus != "start") {
            window.electronAPI.send("show");
            this.router.push("meeting-details/" + data.meetingId);
          }
        }
      );
      this.notificationRecieverRegistrated = true;

      window.electronAPI.receive(
        "notification-summary-silence-clicked",
        (data) => {
          window.electronAPI.send("show");
        }
      );

      // Calendar events
      window.electronAPI.receive(
        "notification-meeting-started-clicked",
        (data) => {
          window.electronAPI.send("show");
          if (meetingStore.recordStatus != "start") {
            this.startSummaryByNotification = true;
            let timestamp = new Date(data.eventEndTime)
            this.currentMeetingEndTime = timestamp.getTime() + 600000 // 10 minutes later
            this.router.push("home");
          }
        }
      );

      // Calendar event end reminder
      window.electronAPI.receive(
        "notification-meeting-ended-reminder-clicked",
        (data) => {
          if(meetingStore.recordStatus == "start") {
            window.electronAPI.send("show");
            this.currentMeetingEndTime = null
          }
        }
      );
    }
  }
});
