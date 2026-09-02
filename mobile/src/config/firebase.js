import axios from 'axios';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBm0FCjDKKN1d45hCLXsMj0fyglgLEkhYw",
  authDomain: "expense-tracker-c32b8.firebaseapp.com",
  projectId: "expense-tracker-c32b8",
  storageBucket: "expense-tracker-c32b8.firebasestorage.app",
  messagingSenderId: "837443185201",
  appId: "1:837443185201:web:a087e62e0aaa32ec1e0310",
  measurementId: "G-3JF7BWZW0X"
};

const BASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

/**
 * Firebase Email & Password Sign In
 * Directly communicates with Google Firebase Identity Toolkit API
 */
export const firebaseSignIn = async (email, password) => {
  try {
    const res = await axios.post(
      `${BASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );
    return res.data; // contains idToken, email, refreshToken, localId
  } catch (error) {
    const msg = error.response?.data?.error?.message;
    if (msg === 'EMAIL_NOT_FOUND' || msg === 'INVALID_PASSWORD' || msg === 'INVALID_LOGIN_CREDENTIALS') {
      throw new Error('Invalid email or password.');
    }
    if (msg === 'USER_DISABLED') {
      throw new Error('This account has been disabled.');
    }
    throw new Error(msg || 'Firebase login failed.');
  }
};

/**
 * Firebase Email & Password Registration
 */
export const firebaseSignUp = async (email, password) => {
  try {
    const res = await axios.post(
      `${BASE_AUTH_URL}:signUp?key=${FIREBASE_CONFIG.apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );
    return res.data; // contains idToken, email, refreshToken, localId
  } catch (error) {
    const msg = error.response?.data?.error?.message;
    if (msg === 'EMAIL_EXISTS') {
      throw new Error('An account with this email already exists.');
    }
    if (msg === 'WEAK_PASSWORD : Password should be at least 6 characters') {
      throw new Error('Password must be at least 6 characters.');
    }
    throw new Error(msg || 'Firebase registration failed.');
  }
};
