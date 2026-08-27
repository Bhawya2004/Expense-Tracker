import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBm0FCjDKKN1d45hCLXsMj0fyglgLEkhYw",
  authDomain: "expense-tracker-c32b8.firebaseapp.com",
  projectId: "expense-tracker-c32b8",
  storageBucket: "expense-tracker-c32b8.firebasestorage.app",
  messagingSenderId: "837443185201",
  appId: "1:837443185201:web:a087e62e0aaa32ec1e0310",
  measurementId: "G-3JF7BWZW0X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
