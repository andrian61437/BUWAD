import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { getDatabase, ref, onValue, update, push, remove, query, orderByKey, limitToLast } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import WelcomeScreen from './views/WelcomeScreen';
import LanguageSelector from './views/LanguageSelector';
import Dashboard from './views/Dashboard';
import Controls from './views/Controls';
import Alerts from './views/Alerts';
import Logs from './views/Logs';
import { 
  isNotificationSupported, 
  requestNotificationPermission, 
  initializeFCM, 
  listenForForegroundMessages, 
  setupNotificationTriggers,
  areNotificationsEnabled,
  getBrowserUnsupportedMessage
} from './utils/notifications';

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
const database = getDatabase(app);

const MAX_LOCAL_LOGS = 200;

function AppContent() {
  const [stage, setStage] = useState('welcome');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('buwad_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme === 'dark' || (!savedTheme && prefersDark);
  });
  const [isSystemPoweredOn, setIsSystemPoweredOn] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [messagingInstance, setMessagingInstance] = useState(null);
  const { t, resetLanguage } = useLanguage();
  const [sensorData, setSensorData] = useState({
    temperature: 32.4,
    humidity: 65,
    sunlight: 78,
    rainDetected: false
  });
  
  const [systemState, setSystemState] = useState({
    phase: 'activeflipping',
    nextFlip: 0,
    isPaused: false,
    manualOverride: false,
    dryingMode: 'danggit',
    flipMode: 'timer'
  });
  
  const [alerts, setAlerts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [toast, setToast] = useState(null);
  
  const isManualProcessingRef = useRef(false);
  const manualFlipTimeoutRef = useRef(null);
  const lastLocalDryingModeRef = useRef('danggit');
  const lastLocalFlipModeRef = useRef('timer');
  const lastLocalManualOverrideRef = useRef(false);
  const ignoreNextSystemUpdateRef = useRef(false);
  const localLogIdsRef = useRef(new Set());
  const foregroundUnsubscribeRef = useRef(null);
  const triggersCleanupRef = useRef(null);
  const logsLoadedRef = useRef(false);

  const formatToStandardTime = useCallback((timestamp) => {
    if (!timestamp) return '--:-- --';
    
    let hours, minutes;
    
    if (timestamp.includes(':')) {
      const parts = timestamp.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1];
    } else {
      return timestamp;
    }
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const standardHours = hours % 12 || 12;
    
    return `${standardHours}:${minutes} ${ampm}`;
  }, []);

  const isHeaderActive = isSystemPoweredOn && hasRealData;

  // COMMENTED OUT - Firebase write operations to avoid permission_denied
  const syncLogToFirebase = useCallback(async (logEntry, localId) => {
    // Temporarily disabled to avoid permission_denied
    console.log('Log would be saved to Firebase (disabled):', logEntry);
    return;
    /*
    if (!database) return;
    try {
      const logsRef = ref(database, 'logs');
      await push(logsRef, {
        id: localId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        action: logEntry.action,
        details: logEntry.details,
        sensorValues: logEntry.sensorValues || null
      });
    } catch (error) {}
    */
  }, []);

  // COMMENTED OUT - Firebase write operations to avoid permission_denied
  const syncSystemToFirebase = useCallback(async (updates) => {
    // Temporarily disabled to avoid permission_denied
    console.log('System update would be saved to Firebase (disabled):', updates);
    return;
    /*
    if (!database) return;
    try {
      const systemRef = ref(database, 'system');
      ignoreNextSystemUpdateRef.current = true;
      await update(systemRef, updates);
    } catch (error) {}
    */
  }, []);

  useEffect(() => {
    const supported = isNotificationSupported();
    setNotificationsSupported(supported);
    if (!supported) {
      setNotificationMessage(getBrowserUnsupportedMessage());
    }
  }, []);

  useEffect(() => {
    if (stage === 'dashboard' && notificationsSupported && areNotificationsEnabled() && !notificationsEnabled) {
      const initNotifications = async () => {
        const result = await initializeFCM(app, database, firebaseConfig);
        if (result) {
          setFcmToken(result.token);
          setMessagingInstance(result.messaging);
          setNotificationsEnabled(true);
        }
      };
      
      initNotifications();
    }
  }, [stage, notificationsSupported, notificationsEnabled]);

  useEffect(() => {
    if (messagingInstance) {
      foregroundUnsubscribeRef.current = listenForForegroundMessages(
        messagingInstance, 
        (payload) => {
          const title = payload.notification?.title || 'BUWAD Alert';
          const body = payload.notification?.body || '';
          showToast(`${title}: ${body}`, 'info');
        }
      );
    }
    
    return () => {
      if (foregroundUnsubscribeRef.current) {
        foregroundUnsubscribeRef.current();
      }
    };
  }, [messagingInstance]);

  useEffect(() => {
    if (notificationsEnabled && database) {
      triggersCleanupRef.current = setupNotificationTriggers(database);
    }
    
    return () => {
      if (triggersCleanupRef.current) {
        triggersCleanupRef.current();
      }
    };
  }, [notificationsEnabled]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('App Service Worker registered'))
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);

  useEffect(() => {
    const savedPreference = localStorage.getItem('buwad_save_language');
    if (savedPreference === 'true') {
      setStage('dashboard');
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('buwad_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('buwad_theme', 'light');
      }
      return newMode;
    });
  }, []);

  const handleSystemPowerToggle = useCallback((newState) => {
    setIsSystemPoweredOn(newState);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const addLogEntry = useCallback((logEntry) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    localLogIdsRef.current.add(uniqueId);
    
    const newLog = {
      id: uniqueId,
      timestamp: timeString,
      formattedTime: formatToStandardTime(timeString),
      action: logEntry.action,
      details: logEntry.details,
      sensorValues: logEntry.sensorValues || null,
      isLocal: true
    };
    
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      return updated.slice(0, MAX_LOCAL_LOGS);
    });
    
    // COMMENTED OUT - Temporarily disable Firebase sync
    // syncLogToFirebase(logEntry, uniqueId);
  }, [formatToStandardTime, syncLogToFirebase]);

  const handleManualOverride = useCallback(() => {
    if (isManualProcessingRef.current) return;
    
    isManualProcessingRef.current = true;
    lastLocalManualOverrideRef.current = true;
    
    if (manualFlipTimeoutRef.current) {
      clearTimeout(manualFlipTimeoutRef.current);
    }
    
    setSystemState(prev => ({ ...prev, manualOverride: true }));
    
    addLogEntry({
      action: 'FLIP NOW',
      details: 'Manual fish flip executed - Mechanism activated'
    });
    
    // COMMENTED OUT - Temporarily disable Firebase sync
    // syncSystemToFirebase({
    //   manual_trigger: true,
    //   manualOverride: true,
    //   lastOverride: Date.now()
    // });
    
    manualFlipTimeoutRef.current = setTimeout(() => {
      isManualProcessingRef.current = false;
      lastLocalManualOverrideRef.current = false;
      manualFlipTimeoutRef.current = null;
      
      setSystemState(prev => ({ ...prev, manualOverride: false }));
      
      // COMMENTED OUT - Temporarily disable Firebase sync
      // syncSystemToFirebase({
      //   manual_trigger: false,
      //   manualOverride: false
      // });
    }, 3000);
    
  }, [addLogEntry, syncSystemToFirebase]);
  
  const handleDryingModeToggle = useCallback((mode) => {
    if (mode === lastLocalDryingModeRef.current) return;
    
    const previousMode = lastLocalDryingModeRef.current;
    lastLocalDryingModeRef.current = mode;
    
    setSystemState(prev => ({ ...prev, dryingMode: mode }));
    
    addLogEntry({ 
      action: 'DRYING MODE CHANGED', 
      details: `Fish profile switched from ${previousMode === 'danggit' ? 'Danggit (Rabbitfish)' : 'Bolinao (Anchovies)'} to ${mode === 'danggit' ? 'Danggit (Rabbitfish)' : 'Bolinao (Anchovies)'}`,
      sensorValues: { 
        profile: mode === 'danggit' ? 'Danggit' : 'Bolinao',
        type: mode === 'danggit' ? 'Thick Fillet' : 'Small Mass',
        cycleInterval: mode === 'danggit' ? '38s' : '22s'
      }
    });
    
    // COMMENTED OUT - Temporarily disable Firebase sync
    // syncSystemToFirebase({ dryingMode: mode });
    
  }, [addLogEntry, syncSystemToFirebase]);

  const handleFlipModeToggle = useCallback((mode) => {
    if (mode === lastLocalFlipModeRef.current) return;
    
    const previousMode = lastLocalFlipModeRef.current;
    lastLocalFlipModeRef.current = mode;
    
    setSystemState(prev => ({ ...prev, flipMode: mode }));
    
    addLogEntry({ 
      action: 'FLIP MODE CHANGED', 
      details: `Flipping mode switched from ${previousMode === 'environment' ? 'Environment-Based' : 'Timer-Based'} to ${mode === 'environment' ? 'Environment-Based' : 'Timer-Based'}`,
      sensorValues: { 
        mode: mode === 'environment' ? 'Environment' : 'Timer',
        trigger: mode === 'environment' ? 'Sensor-driven' : 'Fixed interval'
      }
    });
    
    // COMMENTED OUT - Temporarily disable Firebase sync
    // syncSystemToFirebase({ flipMode: mode });
    
  }, [addLogEntry, syncSystemToFirebase]);

  const handleToggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      if (fcmToken && database) {
        try {
          const tokenRef = ref(database, `fcmTokens/${fcmToken}`);
          await remove(tokenRef);
        } catch (error) {
          console.error('Error removing FCM token:', error);
        }
      }
      setNotificationsEnabled(false);
      setFcmToken(null);
      setMessagingInstance(null);
      showToast('Notifications disabled');
    } else {
      const permissionResult = await requestNotificationPermission();
      if (permissionResult.granted) {
        const fcmResult = await initializeFCM(app, database, firebaseConfig);
        if (fcmResult) {
          setFcmToken(fcmResult.token);
          setMessagingInstance(fcmResult.messaging);
          setNotificationsEnabled(true);
          showToast('Notifications enabled');
        } else {
          showToast('Failed to initialize notifications', 'error');
        }
      } else if (permissionResult.permission === 'denied') {
        showToast('Notification permission was denied. Enable in browser settings.', 'error');
      } else {
        showToast('Notification permission dismissed', 'error');
      }
    }
  }, [notificationsEnabled, fcmToken, showToast]);

  useEffect(() => {
    if (!database) return;

    const sensorsRef = ref(database, 'sensors');
    const systemRef = ref(database, 'system');
    const alertsRef = ref(database, 'alerts');
    
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.temperature && data.temperature !== 0) {
        setSensorData({
          temperature: data.temperature || 32.4,
          humidity: data.humidity || 65,
          sunlight: data.sunlight || 78,
          rainDetected: data.rainDetected || false
        });
        setHasRealData(true);
      } else {
        setHasRealData(false);
        setSensorData({
          temperature: 32.4,
          humidity: 65,
          sunlight: 78,
          rainDetected: false
        });
      }
    });
    
    const unsubscribeSystem = onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      if (ignoreNextSystemUpdateRef.current) {
        ignoreNextSystemUpdateRef.current = false;
        return;
      }
      
      setSystemState(prev => {
        const updates = {};
        
        if (data.phase && data.phase !== prev.phase) {
          updates.phase = data.phase;
        }
        if (data.nextFlip !== undefined && data.nextFlip !== prev.nextFlip) {
          updates.nextFlip = data.nextFlip;
        }
        if (data.isPaused !== undefined && data.isPaused !== prev.isPaused) {
          updates.isPaused = data.isPaused;
        }
        if (data.dryingMode && data.dryingMode !== lastLocalDryingModeRef.current && data.dryingMode !== prev.dryingMode) {
          updates.dryingMode = data.dryingMode;
        }
        if (data.flipMode && data.flipMode !== lastLocalFlipModeRef.current && data.flipMode !== prev.flipMode) {
          updates.flipMode = data.flipMode;
        }
        if (data.manualOverride !== undefined && !lastLocalManualOverrideRef.current && data.manualOverride !== prev.manualOverride) {
          updates.manualOverride = data.manualOverride;
        }
        
        if (Object.keys(updates).length === 0) {
          return prev;
        }
        
        return { ...prev, ...updates };
      });
    });
    
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alertsList = Object.values(data);
        setAlerts(alertsList.slice(-15).reverse());
      }
    });

    const logsRef = ref(database, 'logs');
    const logsQuery = query(logsRef, orderByKey(), limitToLast(50));
    
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data && !logsLoadedRef.current) {
        const firebaseLogs = Object.values(data)
          .filter(log => log && log.action && !localLogIdsRef.current.has(log.id))
          .map(log => ({
            id: log.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: log.timestamp || '--:--',
            formattedTime: formatToStandardTime(log.timestamp || '--:--'),
            action: log.action,
            details: log.details || '',
            sensorValues: log.sensorValues || null,
            isLocal: false
          }))
          .reverse()
          .slice(0, MAX_LOCAL_LOGS);
        
        if (firebaseLogs.length > 0) {
          setActivityLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = firebaseLogs.filter(l => !existingIds.has(l.id));
            const merged = [...newLogs, ...prev];
            merged.sort((a, b) => {
              const timeA = a.timestamp || '00:00';
              const timeB = b.timestamp || '00:00';
              return timeB.localeCompare(timeA);
            });
            return merged.slice(0, MAX_LOCAL_LOGS);
          });
        }
        logsLoadedRef.current = true;
      }
    }, { onlyOnce: false });
    
    return () => {
      unsubscribeSensors();
      unsubscribeSystem();
      unsubscribeAlerts();
      unsubscribeLogs();
      if (triggersCleanupRef.current) {
        triggersCleanupRef.current();
      }
      if (foregroundUnsubscribeRef.current) {
        foregroundUnsubscribeRef.current();
      }
    };
  }, [formatToStandardTime]);

  const getSunlightLabel = () => {
    if (sensorData.sunlight > 70) return 'INTENSE';
    if (sensorData.sunlight > 40) return 'MODERATE';
    return 'LOW';
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: '▦' },
    { id: 'controls', label: t('controls'), icon: '◷' },
    { id: 'alerts', label: t('alerts'), icon: '◬' },
    { id: 'logs', label: t('logs'), icon: '☰' }
  ];

  const DashboardHeader = () => (
    <header className="sticky top-0 z-20 px-5 pt-6 pb-4 border-b bg-transparent border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
            BUWAD
          </h1>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className={`w-2 h-2 rounded-full transition-colors duration-500 ${isHeaderActive ? 'bg-green-500' : 'bg-red-500'}`}
          />
        </div>
        
        <div className="flex items-center gap-1.5">
          {notificationsSupported && (
            <motion.button
              type="button"
              onClick={handleToggleNotifications}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-colors duration-500 ${
                notificationsEnabled 
                  ? 'text-green-500 hover:bg-green-500/10' 
                  : 'text-red-500 hover:bg-red-500/10'
              }`}
              title={notificationsEnabled ? 'Notifications enabled - Click to disable' : 'Notifications disabled - Click to enable'}
            >
              {notificationsEnabled ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.73 21a2 2 0 01-3.46 0M18 8.27A6.47 6.47 0 0012 3a6.47 6.47 0 00-6 5.27M12 3v0M18 8.27l1.23 1.64A2 2 0 0117.5 13H6.5a2 2 0 01-1.72-3.09L6 8.27M8 17h8M3 3l18 18" />
                </svg>
              )}
            </motion.button>
          )}
          
          <motion.button
            type="button"
            onClick={() => {
              resetLanguage();
              localStorage.removeItem('buwad_save_language');
              localStorage.removeItem('buwad_language');
              setStage('welcome');
            }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl hover:bg-[#00386D]/10 dark:hover:bg-[#6699CC]/20 transition-colors duration-500"
          >
            <svg className="w-5 h-5 text-[#00386D] dark:text-[#94A3B8] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </motion.button>
          
          <motion.button
            type="button"
            onClick={toggleDarkMode}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl hover:bg-[#00386D]/10 dark:hover:bg-[#6699CC]/20 transition-colors duration-500"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-[#6699CC] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#00386D] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );

  if (stage === 'welcome') {
    return <WelcomeScreen onGetStarted={() => setStage('language')} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
  }

  if (stage === 'language') {
    return <LanguageSelector 
      toggleDarkMode={toggleDarkMode} 
      isDarkMode={isDarkMode} 
      onLanguageSelected={() => setStage('dashboard')}
    />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 bg-transparent">
        <DashboardHeader />
        {notificationMessage && (
          <div className="px-5 pt-2">
            <div className="rounded-xl border border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/20 px-3 py-2">
              <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                {notificationMessage}
              </div>
            </div>
          </div>
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg bg-white/90 dark:bg-[#1A202C]/90 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500"
            >
              <span className={toast.type === 'success' ? 'text-green-600' : toast.type === 'error' ? 'text-red-600' : 'text-[#6699CC]'}>
                {toast.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 px-5 py-6">
          {!hasRealData && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/20 px-4 py-2 mb-4 transition-colors duration-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                    DEMO MODE
                  </div>
                  <div className="text-[9px] font-medium text-amber-600/70 dark:text-amber-400/70">
                    No sensor data available · Displaying sample values
                  </div>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  sensorData={sensorData} 
                  systemState={systemState} 
                  sunlightLabel={getSunlightLabel()} 
                  formatCountdown={formatCountdown} 
                  t={t}
                  onSystemToggle={handleSystemPowerToggle}
                  isSystemOn={isSystemPoweredOn}
                />
              )}
              {activeTab === 'controls' && (
                <Controls 
                  dryingMode={systemState.dryingMode}
                  flipMode={systemState.flipMode}
                  onDryingModeToggle={handleDryingModeToggle}
                  onFlipModeToggle={handleFlipModeToggle}
                  onManualOverride={handleManualOverride}
                  t={t}
                />
              )}
              {activeTab === 'alerts' && (
                <Alerts alerts={alerts} rainDetected={sensorData.rainDetected} t={t} />
              )}
              {activeTab === 'logs' && (
                <Logs activityLogs={activityLogs} t={t} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <LayoutGroup>
          <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl shadow-lg bg-white/90 dark:bg-[#1A202C]/90 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
            <div className="flex justify-around items-center p-2">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className="relative flex-1 py-3 flex flex-col items-center gap-1 rounded-xl"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -2 }}
                >
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-[#00386D]/10 dark:bg-[#6699CC]/20 transition-colors duration-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className={`text-lg relative z-10 transition-colors duration-500 ${
                    activeTab === item.id 
                      ? 'text-[#00386D] dark:text-[#6699CC]' 
                      : 'text-[#4A5568] dark:text-[#94A3B8]'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`text-[8px] font-bold tracking-[0.1em] relative z-10 transition-colors duration-500 ${
                    activeTab === item.id 
                      ? 'text-[#00386D] dark:text-[#6699CC]' 
                      : 'text-[#4A5568] dark:text-[#94A3B8]'
                  }`}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </nav>
        </LayoutGroup>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;