// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyATM8CkDQMFGOTUPNYRLDRxJfe06Kthm8I",
  authDomain: "vocalgenx.firebaseapp.com",
  projectId: "vocalgenx",
  storageBucket: "vocalgenx.appspot.com",
  messagingSenderId: "534297209183",
  appId: "1:534297209183:web:72130769fe583b16176eea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Google Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Functions
export const functions = getFunctions(app);

// Cloud Function to send email notification
export const sendEmailNotification = httpsCallable(functions, 'sendEmailNotification');

export default app;
