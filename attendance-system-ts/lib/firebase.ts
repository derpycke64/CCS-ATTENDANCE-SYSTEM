import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDzN9YKcdAJxzIOQgR1DLLfCaVoJqxS9mI",
  authDomain: "attendance-system-83718.firebaseapp.com",
  projectId: "attendance-system-83718",
  storageBucket: "attendance-system-83718.firebasestorage.app",
  messagingSenderId: "930133428171",
  appId: "1:930133428171:web:fe93e2114e4fffb648d84e",
  measurementId: "G-60H5FPZZ3N"
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


export const auth = getAuth(app);