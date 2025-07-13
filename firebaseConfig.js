import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjcje6oLjeS41epzKF9o7X96Av-XmUZ38",
  authDomain: "lpgshopapp.firebaseapp.com",
  projectId: "lpgshopapp",
  storageBucket: "lpgshopapp.firebasestorage.app",
  messagingSenderId: "265233395756",
  appId: "1:265233395756:android:d787d68a6085a34377e189"
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create mock objects to prevent crashes
  app = null;
  db = null;
}

export { app, db };