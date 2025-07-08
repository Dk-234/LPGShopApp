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

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);