// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { connectStorageEmulator, getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
let firebaseConfig;

// if (process.env.NODE_ENV === "development") {
//   firebaseConfig = {
//     apiKey: "AIzaSyDVjSNOKxybWoX-IbSYIvnrlE9Cvx7m7VM",
//     authDomain: "jamie-core-staging.firebaseapp.com",
//     projectId: "jamie-core-staging",
//     storageBucket: "jamie-core-staging.appspot.com",
//     messagingSenderId: "486965018053",
//     appId: "1:486965018053:web:5d020d369c3cb721a81fac"
//   };
// } else {
  // production
  firebaseConfig = {
    apiKey: "AIzaSyCi2qivDu3Kplkk7xBcstnjlvBW9LxTkfo",
    authDomain: "jamie-core.firebaseapp.com",
    projectId: "jamie-core",
    storageBucket: "jamie-core.appspot.com",
    messagingSenderId: "679073168132",
    appId: "1:679073168132:web:c0ad46aec173fc46c72e51"
  };
// }

let app = initializeApp(firebaseConfig);

const functions = getFunctions(app, "europe-west1");
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

if (window.location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectFirestoreEmulator(db, "localhost", 8085);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectStorageEmulator(storage, "localhost", 9199);
}

export { functions, db, auth, storage };
