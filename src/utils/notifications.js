import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref as dbRef, set as dbSet, onValue as dbOnValue, get as dbGet, remove as dbRemove } from 'firebase/database';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return { granted: false, error: 'Notifications not supported in this browser' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted', permission };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { granted: false, error: error.message };
  }
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

const sendConfigToSW = async (swRegistration, config) => {
  if (!swRegistration || !swRegistration.active) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (swRegistration.active) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
  
  swRegistration.active.postMessage({
    type: 'FCM_CONFIG',
    config: config
  });
};

const cleanupOldTokens = async (database) => {
  if (!database) return;
  
  try {
    const tokensRef = dbRef(database, 'fcmTokens');
    const snapshot = await dbGet(tokensRef);
    const tokens = snapshot.val();
    
    if (tokens) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const currentUserAgent = navigator.userAgent;
      
      for (const [token, data] of Object.entries(tokens)) {
        if (data && data.createdAt && data.createdAt < thirtyDaysAgo) {
          await dbRemove(dbRef(database, `fcmTokens/${token}`));
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old tokens:', error);
  }
};

export const initializeFCM = async (firebaseApp, database, firebaseConfig) => {
  if (!isNotificationSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    await sendConfigToSW(swRegistration, firebaseConfig);
    
    const messaging = getMessaging(firebaseApp);
    
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (currentToken) {
      await cleanupOldTokens(database);
      
      const tokenRef = dbRef(database, `fcmTokens/${currentToken}`);
      await dbSet(tokenRef, {
        createdAt: Date.now(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
      
      return { token: currentToken, messaging, swRegistration };
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('FCM initialization error:', error);
    return null;
  }
};

export const listenForForegroundMessages = (messaging, onMessageReceived) => {
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    if (onMessageReceived) {
      onMessageReceived(payload);
    }

    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'BUWAD Alert';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: payload.data?.tag || 'buwad-notification',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        requireInteraction: payload.data?.priority === 'high'
      };

      new Notification(notificationTitle, notificationOptions);
    }
  });

  return unsubscribe;
};

export const setupNotificationTriggers = (database) => {
  if (!database) return () => {};

  const triggers = [];
  let lastRainState = false;
  let wasOnline = navigator.onLine;

  const sensorsRef = dbRef(database, 'sensors');
  const unsubscribeRain = dbOnValue(sensorsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const currentRainState = data.rainDetected || false;
      
      if (currentRainState && !lastRainState) {
        showNotification('RAIN DETECTED', {
          body: 'Moisture detected - Check enclosure immediately',
          tag: 'rain-alert',
          requireInteraction: true
        });
      }
      
      if (!currentRainState && lastRainState) {
        showNotification('RAIN CLEARED', {
          body: 'Conditions are dry again - Drying can resume',
          tag: 'rain-cleared',
          requireInteraction: false
        });
      }
      
      lastRainState = currentRainState;
    }
  });

  triggers.push(unsubscribeRain);

  const handleOnline = () => {
    if (!wasOnline) {
      wasOnline = true;
      showNotification('SYSTEM ONLINE', {
        body: 'Connection restored - Monitoring resumed',
        tag: 'system-online',
        requireInteraction: false
      });
    }
  };

  const handleOffline = () => {
    if (wasOnline) {
      wasOnline = false;
      showNotification('SYSTEM OFFLINE', {
        body: 'Connection lost - Check ESP32 and network',
        tag: 'system-offline',
        requireInteraction: true
      });
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    triggers.forEach(unsubscribe => unsubscribe());
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

export const showNotification = (title, options = {}) => {
  if (!isNotificationSupported()) return;
  
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200],
        ...options
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
};

export const areNotificationsEnabled = () => {
  return getNotificationPermission() === 'granted';
};

export const getBrowserUnsupportedMessage = () => {
  if (!isNotificationSupported()) {
    return 'Push notifications are not supported in this browser. Please use Chrome, Firefox, or Edge.';
  }
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    return 'On iOS, notifications require adding BUWAD to your Home Screen first.';
  }
  
  return null;
};