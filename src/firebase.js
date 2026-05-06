// Lazy initialize Firebase - only loads when needed
let databaseInstance = null;

export const getDatabase = async () => {
  if (!databaseInstance) {
    const { initializeApp } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');
    
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    
    const app = initializeApp(firebaseConfig);
    databaseInstance = getDatabase(app);
  }
  return databaseInstance;
};

// For backward compatibility
export const database = null;