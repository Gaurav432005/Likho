import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your existing config
const firebaseConfig = {
  apiKey: "AIzaSyAsyXz_gRm0OATYI57CMkVNZqjpPfvSZyI",
  authDomain: "gaurav-77c26.firebaseapp.com",
  projectId: "gaurav-77c26",
  storageBucket: "gaurav-77c26.firebasestorage.app",
  messagingSenderId: "899094149315",
  appId: "1:899094149315:web:51a5bbe02794b0f10dca76"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();