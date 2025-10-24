// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAteS4KUB0-4zAeRBp5qxwlN6E2PzkhRPs",
  authDomain: "cor1-d0bb8.firebaseapp.com",
  projectId: "cor1-d0bb8",
  storageBucket: "cor1-d0bb8.firebasestorage.app",
  messagingSenderId: "12664739951",
  appId: "1:12664739951:web:b43fb19deee701e327d59a",
  measurementId: "G-YX6GXM9BCR"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };