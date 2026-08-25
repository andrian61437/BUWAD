import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { getDatabase, ref, onValue, update, push, remove, query, orderByKey, limitToLast } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
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
  const [stage, setStage] = useState('dashboard');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('buwad_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme === 'dark' || (!savedTheme && prefersDark);
  });
  const [isSystemPoweredOn, setIsSystemPoweredOn] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [messagingInstance, setMessagingInstance] = useState(null);
  const { t, language, selectLanguage, resetLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: 'US' },
    { code: 'tl', name: 'Tagalog', flag: 'PH' },
    { code: 'ceb', name: 'Cebuano', flag: 'PH' }
  ];
  const [sensorData, setSensorData] = useState(null);
  const [systemState, setSystemState] = useState({
    phase: 'offline', nextFlip: 0, isPaused: false,
    manualOverride: false, dryingMode: 'danggit', flipMode: 'timer',
    coverClosed: false
  });
  const [alerts, setAlerts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);
  
  const lastPingRef = useRef(null);
  const lastPingTimeRef = useRef(0);
  const firstSeenTimeRef = useRef(0);
  const localLogIdsRef = useRef(new Set());
  const foregroundUnsubscribeRef = useRef(null);
  const triggersCleanupRef = useRef(null);
  const logsLoadedRef = useRef(false);
  const ignoreNextSystemUpdateRef = useRef(false);

  const formatToStandardTime = useCallback((timestamp) => {
    if (!timestamp) return '--:-- --';
    let hours, minutes;
    if (timestamp.includes(':')) {
      const parts = timestamp.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1];
    } else return timestamp;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hours % 12 || 12}:${minutes} ${ampm}`;
  }, []);

  const isHeaderActive = connectionStatus === 'online' && isSystemPoweredOn;

  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      // On startup: if after 5 seconds the initial ping never changes, mark offline
      if (connectionStatus === 'checking' && firstSeenTimeRef.current > 0 && now - firstSeenTimeRef.current > 5000) {
        setConnectionStatus('offline');
        setIsDeviceOnline(false);
      }
      // While online: allow up to 10 seconds of WiFi/SSL latency before marking offline
      if (isDeviceOnline && lastPingTimeRef.current > 0 && now - lastPingTimeRef.current > 10000) {
        setIsDeviceOnline(false);
        setConnectionStatus('offline');
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, [connectionStatus, isDeviceOnline]);

  const writeToSystem = useCallback(async (updates) => {
    if (!database) return;
    try {
      ignoreNextSystemUpdateRef.current = true;
      await update(ref(database, 'system'), updates);
      setTimeout(() => { ignoreNextSystemUpdateRef.current = false; }, 1500);
    } catch (error) { console.error('System write failed:', error); }
  }, []);

  const syncLogToFirebase = useCallback(async (logEntry, localId) => {
    if (!database) return;
    try {
      await push(ref(database, 'logs'), {
        id: localId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        action: logEntry.action,
        details: logEntry.details,
        sensorValues: logEntry.sensorValues || null
      });
    } catch (error) { console.error('Log sync failed:', error); }
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
    setActivityLogs(prev => {
      const updated = [{ id: uniqueId, timestamp: timeString, formattedTime: formatToStandardTime(timeString), action: logEntry.action, details: logEntry.details, sensorValues: logEntry.sensorValues || null, isLocal: true }, ...prev];
      return updated.slice(0, MAX_LOCAL_LOGS);
    });
    syncLogToFirebase(logEntry, uniqueId);
  }, [formatToStandardTime, syncLogToFirebase]);

  const handleSystemPowerToggle = useCallback((newState) => {
    setIsSystemPoweredOn(newState);
    writeToSystem({ powerOn: newState });
  }, [writeToSystem]);

  const handleManualOverride = useCallback(() => {
    setSystemState(prev => ({ ...prev, manualOverride: true }));
    addLogEntry({ action: 'FLIP NOW', details: 'Manual flip triggered' });
    writeToSystem({ manualFlip: true, lcdMessage: "Manual Flip|FLIPPING NOW..." });
    setTimeout(() => { setSystemState(prev => ({ ...prev, manualOverride: false })); }, 3000);
  }, [addLogEntry, writeToSystem]);

  const handleCoverToggle = useCallback(() => {
    const isCurrentlyClosed = systemState.coverClosed;
    addLogEntry({ action: 'COVER NOW', details: isCurrentlyClosed ? 'Opening cover' : 'Closing cover' });
    writeToSystem({ manualCover: true, lcdMessage: isCurrentlyClosed ? "Cover Now|COVER OPENED" : "Cover Now|COVER CLOSED" });
  }, [systemState.coverClosed, addLogEntry, writeToSystem]);
  
  const handleDryingModeToggle = useCallback((mode) => {
    setSystemState(prev => prev.dryingMode === mode ? prev : { ...prev, dryingMode: mode });
    addLogEntry({ action: 'DRYING MODE CHANGED', details: `Switched to ${mode}`, sensorValues: { profile: mode, cycleInterval: mode === 'danggit' ? '15s' : '10s' } });
    writeToSystem({ dryingMode: mode, lcdMessage: mode === 'danggit' ? "Switching to|DANGGIT" : "Switching to|BOLINAO" });
  }, [addLogEntry, writeToSystem]);

  const handleFlipModeToggle = useCallback((mode) => {
    setSystemState(prev => prev.flipMode === mode ? prev : { ...prev, flipMode: mode });
    addLogEntry({ action: 'FLIP MODE CHANGED', details: `Switched to ${mode}` });
    writeToSystem({ flipMode: mode, lcdMessage: mode === 'environment' ? "Switching to|ENV-BASED" : "Switching to|TIMER-BASED" });
  }, [addLogEntry, writeToSystem]);

  const handleDismissAlert = useCallback((alertId) => {
    setDismissedAlertIds(prev => prev.includes(alertId) ? prev : [...prev, alertId]);
  }, []);

  const handleDismissAllAlerts = useCallback((alertIds) => {
    setDismissedAlertIds(prev => {
      const merged = new Set([...prev, ...alertIds]);
      return [...merged];
    });
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      if (fcmToken && database) { try { await remove(ref(database, `fcmTokens/${fcmToken}`)); } catch (e) {} }
      setNotificationsEnabled(false); setFcmToken(null); setMessagingInstance(null);
      showToast('Notifications disabled');
    } else {
      const result = await requestNotificationPermission();
      if (result.granted) {
        const fcmResult = await initializeFCM(app, database, firebaseConfig);
        if (fcmResult) { setFcmToken(fcmResult.token); setMessagingInstance(fcmResult.messaging); setNotificationsEnabled(true); showToast('Notifications enabled'); }
        else showToast('Failed to initialize', 'error');
      } else if (result.permission === 'denied') showToast('Permission denied', 'error');
      else showToast('Permission dismissed', 'error');
    }
  }, [notificationsEnabled, fcmToken, showToast]);

  useEffect(() => {
    if (isNotificationSupported()) setNotificationsSupported(true);
    else setNotificationMessage(getBrowserUnsupportedMessage());
  }, []);

  useEffect(() => {
    if (stage === 'dashboard' && notificationsSupported && areNotificationsEnabled() && !notificationsEnabled) {
      initializeFCM(app, database, firebaseConfig).then(result => {
        if (result) { setFcmToken(result.token); setMessagingInstance(result.messaging); setNotificationsEnabled(true); }
      });
    }
  }, [stage, notificationsSupported, notificationsEnabled]);

  useEffect(() => {
    if (messagingInstance) {
      foregroundUnsubscribeRef.current = listenForForegroundMessages(messagingInstance, (payload) => {
        showToast(`${payload.notification?.title || 'BUWAD'}: ${payload.notification?.body || ''}`, 'info');
      });
    }
    return () => { if (foregroundUnsubscribeRef.current) foregroundUnsubscribeRef.current(); };
  }, [messagingInstance]);

  useEffect(() => {
    if (notificationsEnabled && database) triggersCleanupRef.current = setupNotificationTriggers(database);
    return () => { if (triggersCleanupRef.current) triggersCleanupRef.current(); };
  }, [notificationsEnabled]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }, []);



  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const n = !prev;
      if (n) { document.documentElement.classList.add('dark'); localStorage.setItem('buwad_theme', 'dark'); }
      else { document.documentElement.classList.remove('dark'); localStorage.setItem('buwad_theme', 'light'); }
      return n;
    });
  }, []);

  useEffect(() => {
    if (!database) return;
    const unsubSensors = onValue(ref(database, 'sensors'), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const currentPing = data.ping !== undefined ? data.ping : data.timestamp;

      if (lastPingRef.current === null) {
        lastPingRef.current = currentPing;
        firstSeenTimeRef.current = Date.now();
        return;
      }

      if (currentPing !== lastPingRef.current) {
        lastPingRef.current = currentPing;
        lastPingTimeRef.current = Date.now();
        setIsDeviceOnline(true);
        setConnectionStatus('online');
        setSensorData({ 
          temperature: typeof data.temperature === 'number' ? data.temperature : null, 
          humidity: typeof data.humidity === 'number' ? data.humidity : null, 
          sunlight: typeof data.sunlight === 'number' ? data.sunlight : null, 
          rainDetected: data.rainDetected || false,
          sensorFault: data.sensorFault || false,
          motorStalled: data.motorStalled || false
        });
        setHasRealData(true);
      } else if (isDeviceOnline) {
        // Even if ping value was the same momentarily, mark live reception
        lastPingTimeRef.current = Date.now();
      }
    });
    const unsubSystem = onValue(ref(database, 'system'), (snapshot) => {
      if (ignoreNextSystemUpdateRef.current) return;
      const data = snapshot.val();
      if (!data) return;
      if (data.powerOn !== undefined) setIsSystemPoweredOn(data.powerOn);
      setSystemState(prev => ({
        phase: data.phase || prev.phase,
        nextFlip: data.nextFlip !== undefined ? data.nextFlip : prev.nextFlip,
        isPaused: data.isPaused !== undefined ? data.isPaused : prev.isPaused,
        manualOverride: prev.manualOverride,
        dryingMode: data.dryingMode || prev.dryingMode,
        flipMode: data.flipMode || prev.flipMode,
        coverClosed: data.coverClosed !== undefined ? data.coverClosed : prev.coverClosed
      }));
    });
    const unsubAlerts = onValue(ref(database, 'alerts'), (snapshot) => {
      const data = snapshot.val();
      if (data) setAlerts(Object.values(data).slice(-15).reverse());
    });
    const unsubLogs = onValue(query(ref(database, 'logs'), orderByKey(), limitToLast(50)), (snapshot) => {
      const data = snapshot.val();
      if (data && !logsLoadedRef.current) {
        const fbLogs = Object.values(data).filter(l => l?.action && !localLogIdsRef.current.has(l.id))
          .map(l => ({ id: l.id || `${Date.now()}`, timestamp: l.timestamp || '--:--', formattedTime: formatToStandardTime(l.timestamp), action: l.action, details: l.details || '', sensorValues: l.sensorValues || null, isLocal: false }))
          .reverse().slice(0, MAX_LOCAL_LOGS);
        if (fbLogs.length) {
          setActivityLogs(prev => {
            const ids = new Set(prev.map(l => l.id));
            const merged = [...fbLogs.filter(l => !ids.has(l.id)), ...prev];
            merged.sort((a, b) => (b.timestamp || '00:00').localeCompare(a.timestamp || '00:00'));
            return merged.slice(0, MAX_LOCAL_LOGS);
          });
        }
        logsLoadedRef.current = true;
      }
    }, { onlyOnce: false });
    return () => { unsubSensors(); unsubSystem(); unsubAlerts(); unsubLogs(); };
  }, [formatToStandardTime]);

  const getSunlightLabel = () => {
    if (!sensorData || typeof sensorData.sunlight !== 'number') return '--';
    return sensorData.sunlight > 70 ? 'INTENSE' : sensorData.sunlight > 40 ? 'MODERATE' : 'LOW';
  };
  const formatCountdown = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: '▦' },
    { id: 'controls', label: t('controls'), icon: '◷' },
    { id: 'alerts', label: t('alerts'), icon: '◬' },
    { id: 'logs', label: t('logs'), icon: '☰' }
  ];



  return (
    <div className="min-h-screen bg-[#E8EDF3] dark:bg-[#1A202C] transition-colors duration-500">
      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-20 bg-[#E8EDF3] dark:bg-[#1A202C] transition-colors duration-500">
        <header className="sticky top-0 z-20 px-5 pt-6 pb-4 border-b bg-[#E8EDF3] dark:bg-[#1A202C] border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-[#00386D] dark:text-[#F7FAFC]" style={{ fontFamily: 'Space Grotesk' }}>BUWAD</h1>
              <div 
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  connectionStatus === 'online' && isSystemPoweredOn ? 'bg-green-500 shadow-sm shadow-green-500/50' :
                  connectionStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-sm shadow-red-500/50'
                }`} 
              />
            </div>
            <div className="flex items-center gap-1.5">
              {notificationsSupported && (
                <motion.button onClick={handleToggleNotifications} whileTap={{ scale: 0.95 }} className={`p-2 rounded-xl ${notificationsEnabled ? 'text-green-500' : 'text-red-500'}`}>
                  {notificationsEnabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.73 21a2 2 0 01-3.46 0M18 8.27A6.47 6.47 0 0012 3a6.47 6.47 0 00-6 5.27M12 3v0M18 8.27l1.23 1.64A2 2 0 0117.5 13H6.5a2 2 0 01-1.72-3.09L6 8.27M8 17h8M3 3l18 18" /></svg>
                  )}
                </motion.button>
              )}
              <div className="relative">
                <motion.button onClick={() => setShowLangDropdown(!showLangDropdown)} whileTap={{ scale: 0.95 }} className="p-2 rounded-xl">
                  <svg className="w-5 h-5 text-[#00386D] dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                </motion.button>
                <AnimatePresence>
                  {showLangDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] shadow-xl z-50 overflow-hidden"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { selectLanguage(lang.code, true); setShowLangDropdown(false); }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-xs font-bold transition-colors ${
                            language === lang.code
                              ? 'bg-[#6699CC]/10 text-[#6699CC]'
                              : 'text-[#00386D] dark:text-[#F7FAFC] hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black ${
                            language === lang.code ? 'bg-[#6699CC] text-white' : 'bg-[#00386D]/5 dark:bg-[#6699CC]/10 text-[#00386D] dark:text-[#6699CC]'
                          }`}>{lang.flag}</span>
                          <span>{lang.name}</span>
                          {language === lang.code && (
                            <svg className="w-3.5 h-3.5 ml-auto text-[#6699CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button onClick={toggleDarkMode} whileTap={{ scale: 0.95 }} className="p-2 rounded-xl">
                {isDarkMode ? (
                  <svg className="w-5 h-5 text-[#6699CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-[#00386D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </motion.button>
            </div>
          </div>
        </header>
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg bg-white/90 dark:bg-[#1A202C]/90">
              <span className={toast.type === 'success' ? 'text-green-600' : toast.type === 'error' ? 'text-red-600' : 'text-[#6699CC]'}>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 px-5 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  sensorData={sensorData} 
                  systemState={systemState} 
                  sunlightLabel={getSunlightLabel()} 
                  formatCountdown={formatCountdown} 
                  t={t} 
                  onSystemToggle={handleSystemPowerToggle} 
                  isSystemOn={isSystemPoweredOn}
                  isDeviceOnline={isDeviceOnline}
                  connectionStatus={connectionStatus}
                />
              )}
              {activeTab === 'controls' && (
                <Controls 
                  dryingMode={systemState.dryingMode} 
                  flipMode={systemState.flipMode} 
                  coverClosed={systemState.coverClosed} 
                  onDryingModeToggle={handleDryingModeToggle} 
                  onFlipModeToggle={handleFlipModeToggle} 
                  onManualOverride={handleManualOverride} 
                  onCoverToggle={handleCoverToggle} 
                  isDeviceOnline={isDeviceOnline}
                  t={t} 
                />
              )}
              {activeTab === 'alerts' && (
                <Alerts 
                  alerts={alerts} 
                  rainDetected={isDeviceOnline && sensorData?.rainDetected} 
                  dismissedIds={dismissedAlertIds} 
                  onDismiss={handleDismissAlert} 
                  onDismissAll={handleDismissAllAlerts} 
                  t={t} 
                />
              )}
              {activeTab === 'logs' && <Logs activityLogs={activityLogs} t={t} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <LayoutGroup>
          <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl shadow-2xl bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10 z-30">
            <div className="flex justify-around items-center p-2">
              {navItems.map((item) => (
                <motion.button key={item.id} onClick={() => setActiveTab(item.id)} className="relative flex-1 py-3 flex flex-col items-center gap-1 rounded-xl" whileTap={{ scale: 0.95 }}>
                  {activeTab === item.id && <motion.div layoutId="activeNav" className="absolute inset-0 rounded-xl bg-[#00386D]/10 dark:bg-[#6699CC]/20" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                  <span className={`text-lg relative z-10 ${activeTab === item.id ? 'text-[#00386D] dark:text-[#6699CC]' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>{item.icon}</span>
                  <span className={`text-[8px] font-bold tracking-[0.1em] relative z-10 ${activeTab === item.id ? 'text-[#00386D] dark:text-[#6699CC]' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>{item.label}</span>
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
  return <LanguageProvider><AppContent /></LanguageProvider>;
}

export default App;