// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnSzDK0WOxKTN6dFWslUXL1PjzkqenJAs",
  authDomain: "emoti-care.firebaseapp.com",
  projectId: "emoti-care",
  storageBucket: "emoti-care.firebasestorage.app",
  messagingSenderId: "557168013499",
  appId: "1:557168013499:web:6a34aee56e38bb95c5799e",
  measurementId: "G-NMZ38Y84C4"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Enable auth persistence (LOCAL)
setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error("Error setting auth persistence:", error);
  });

// Enable Firestore offline persistence
enableIndexedDbPersistence(db)
  .catch(error => {
    console.error("Error enabling Firestore persistence:", error);
  });

export default app;