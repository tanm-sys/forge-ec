/**
 * Firebase Configuration and Initialization
 * Handles all Firebase service initialization and configuration
 */

// Firebase SDK imports
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBG9YcnodA8Lhpwb3wOoyp93VcqXygcrQ",
  authDomain: "forge-ec.firebaseapp.com",
  databaseURL: "https://forge-ec-default-rtdb.firebaseio.com",
  projectId: "forge-ec",
  storageBucket: "forge-ec.firebasestorage.app",
  messagingSenderId: "436060720516",
  appId: "1:436060720516:web:4c4ac16371db82fcfd61d1",
  measurementId: "G-1BVB7FLGRJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in production)
let analytics = null;
let performance = null;

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  analytics = getAnalytics(app);
  performance = getPerformance(app);
}

export { analytics, performance };

// Development emulator setup
if (window.location.hostname === 'localhost') {
  console.log('🔥 Connecting to Firebase emulators...');

  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.warn('Firebase emulators already connected or not available:', error);
  }
}

// Firebase service status
export const firebaseServices = {
  app,
  db,
  auth,
  functions,
  analytics,
  performance,
  isInitialized: true
};

// Error handling for Firebase initialization
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.code && event.reason.code.startsWith('firebase/')) {
    console.error('Firebase Error:', event.reason);
    // Handle Firebase-specific errors gracefully
    event.preventDefault();
  }
});

console.log('🔥 Firebase services initialized successfully');

export default app;
