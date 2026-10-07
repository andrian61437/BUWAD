import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Dashboard = ({ sensorData, systemState, sunlightLabel, formatCountdown, t, onSystemToggle, onGoToControls, isSystemOn, isDeviceOnline, connectionStatus }) => {
  const [pulseFields, setPulseFields] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const systemOn = isSystemOn !== undefined ? isSystemOn : true;
  const isOnline = isDeviceOnline !== undefined ? isDeviceOnline : true;
  const connStatus = connectionStatus || (isOnline ? 'online' : 'offline');
  const dryingMode = systemState?.dryingMode || 'danggit';
  const flipMode = systemState?.flipMode || 'timer';
  const coverClosed = systemState?.coverClosed || false;
  const isDanggit = dryingMode === 'danggit';
  const isEnvironment = flipMode === 'environment';

  // === Fallback & Reliability Status ===
  const sensorFault = sensorData?.sensorFault || false;
  const motorStalled = sensorData?.motorStalled || false;
  const wifiOffline = systemState?.wifiOffline || false;

  // Collect active fault warnings
  const faultWarnings = [];
  if (connStatus === 'offline') {
    faultWarnings.push({ label: 'ESP32 OFFLINE', detail: 'No live telemetry from board · Check power and WiFi', color: 'red' });
  } else if (connStatus === 'checking') {
    faultWarnings.push({ label: 'CONNECTING...', detail: 'Waiting for live handshake from ESP32', color: 'amber' });
  } else {
    if (sensorFault) faultWarnings.push({ label: 'SENSOR FAULT', detail: 'DHT sensor unreliable — fallback timer active (60s interval)', color: 'amber' });
    if (motorStalled) faultWarnings.push({ label: 'MOTOR JAM', detail: 'Flipping mechanism stalled — check hardware', color: 'red' });
    if (wifiOffline) faultWarnings.push({ label: 'WIFI OFFLINE', detail: 'Local mode active — auto-reconnecting', color: 'amber' });
  }

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const hasSensorData = isOnline && sensorData && 
    typeof sensorData.temperature === 'number' && 
    typeof sensorData.humidity === 'number';
  
  const displayData = {
    temperature: hasSensorData ? sensorData.temperature : null,
    humidity: hasSensorData ? sensorData.humidity : null,
    sunlight: hasSensorData ? sensorData.sunlight : null,
    rainDetected: hasSensorData ? sensorData.rainDetected : false,
    phase: isOnline ? (systemState?.phase ?? 'activeflipping') : 'offline',
    nextFlip: isOnline ? (systemState?.nextFlip ?? 0) : 0
  };

  useEffect(() => {
    if (isLoading || !isOnline) return;
    const fields = ['temperature', 'humidity', 'sunlight', 'rainDetected'];
    fields.forEach(field => {
      setPulseFields(prev => ({ ...prev, [field]: true }));
      setTimeout(() => {
        setPulseFields(prev => ({ ...prev, [field]: false }));
      }, 300);
    });
  }, [sensorData, isLoading, isOnline]);

  const getPulseClass = (field) => {
    if (isLoading || !isOnline) return '';
    return pulseFields[field] ? 'sensor-pulse' : '';
  };

  const [countdown, setCountdown] = useState(systemState?.nextFlip || 0);

  // Sync with incoming Firebase updates with anti-jitter smoothing
  useEffect(() => {
    if (typeof systemState?.nextFlip === 'number') {
      const serverVal = systemState.nextFlip;
      setCountdown(prev => {
        // If a new flip cycle started (server value reset to full interval) or countdown was at 0
        if (serverVal > prev + 2 || prev <= 0) {
          return serverVal;
        }
        // If minor network latency difference (within 2 seconds), keep smooth local countdown
        // to prevent jumping backward or skipping numbers
        if (Math.abs(prev - serverVal) <= 2) {
          return prev;
        }
        // If major drift (> 2 seconds), gently snap to server value
        return serverVal;
      });
    }
  }, [systemState?.nextFlip]);

  // Smooth 1-second local ticker
  useEffect(() => {
    if (!isOnline || !systemOn) return;
    const ticker = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(ticker);
  }, [isOnline, systemOn]);

  const getFlipDisplay = () => {
    if (!systemOn || !isOnline) return null;
    if (!hasSensorData) return null;
    if (isEnvironment) {
      const phase = systemState?.phase;
      if (phase === 'env_cooldown') {
        const secs = countdown > 0 ? countdown : (systemState?.envCooldownSecs || 0);
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
      }
      if (phase === 'waiting_sun') return 'WAITING: SUN < 70%';
      if (phase === 'waiting_temp') return 'WAITING: TEMP < 32°C';
      if (phase === 'waiting_humidity') return 'WAITING: HUM > 65%';
      if (systemState?.envConditionsMet) return 'PEAK DRYING ACTIVE';
      return 'WAITING FOR CONDITIONS';
    }
    if (countdown <= 0 || isNaN(countdown)) {
      return '00:00';
    }
    return formatCountdown(countdown);
  };

  const flipDisplay = getFlipDisplay();

  const getCycleDisplay = () => {
    if (!isOnline) return '--';
    if (sensorFault) return '60s*';
    if (isEnvironment) {
      const state = systemState?.envSolarState;
      if (state === 'PEAK_SOLAR') return 'Peak (Auto)';
      if (state === 'LOW_SOLAR') return 'Low (Auto)';
      return 'Adaptive';
    }
    const interval = systemState?.timerInterval || (isDanggit ? 15 : 10);
    const hrs = Math.floor(interval / 3600);
    const mins = Math.floor((interval % 3600) / 60);
    const secs = interval % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m`;
    return `${secs}s`;
  };

  const handleSystemToggle = () => {
    if (onSystemToggle) {
      onSystemToggle(!systemOn);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] transition-colors duration-500">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black tracking-wide text-[#00386D] dark:text-[#F7FAFC]">CONNECTING...</span>
              <span className="text-xs font-black text-[#6699CC]">ESTABLISHING LINK</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('environmentalData')}</div>
        <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]">
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-b border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('temperature')}</div><div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
            <div className="px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('humidity')}</div><div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
          </div>
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('sunlight')}</div><div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
            <div className="px-3 py-3"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('rainSensor')}</div><div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
          </div>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10"><div className="flex justify-between items-center"><div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('systemState')}</div><div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div></div>
        <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10"><div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">NEXT AUTO FLIP IN</div><div className="h-8 w-24 mx-auto bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10"><div className="flex justify-between items-center"><div><div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">POWER</div><div className="h-4 w-8 mt-0.5 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div><div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" /></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl overflow-hidden border transition-colors duration-500 ${
          connStatus === 'checking'
            ? 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/20'
            : !isOnline
              ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/20'
              : !systemOn 
                ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/20'
                : displayData.rainDetected 
                  ? 'border-[#6699CC]/50 bg-[#6699CC]/10 dark:bg-[#6699CC]/20'
                  : systemState?.isOffHours
                    ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20'
                    : 'border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]'
        }`}
      >
        <div className="px-4 py-2">
          <div className="flex justify-between items-center">
            <span className={`text-xs font-black tracking-wide transition-colors duration-500 ${
              connStatus === 'checking' ? 'text-amber-500 dark:text-amber-400' :
              !isOnline ? 'text-red-500 dark:text-red-400' :
              !systemOn ? 'text-red-500 dark:text-red-400' :
              displayData.rainDetected ? 'text-[#6699CC]' :
              systemState?.isOffHours ? 'text-amber-600 dark:text-amber-400' : 'text-[#00386D] dark:text-[#F7FAFC]'
            }`}>
              {connStatus === 'checking' ? 'CHECKING ESP32...' :
               !isOnline ? 'ESP32 OFFLINE' :
               !systemOn ? 'SYSTEM OFFLINE' :
               displayData.rainDetected ? t('rainDetected') :
               systemState?.isOffHours ? 'OFF-HOURS PAUSED' : t('systemActive') || 'SYSTEM ACTIVE'}
            </span>
            <span className={`text-xs font-black transition-colors duration-500 ${
              connStatus === 'checking' ? 'text-amber-500 dark:text-amber-400' :
              !isOnline ? 'text-red-500 dark:text-red-400' :
              !systemOn ? 'text-red-500 dark:text-red-400' :
              systemState?.isOffHours ? 'text-amber-600 dark:text-amber-400' : 'text-[#6699CC]'
            }`}>
              {connStatus === 'checking' ? 'VERIFYING LIVE LINK' :
               !isOnline ? 'DEVICE DISCONNECTED' :
               !systemOn ? 'PRESS TURN ON TO START' :
               systemState?.isOffHours ? 'FLIPPING HALTED · RESUMES 7 AM' : t('enclosureSecured')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* === Fallback & Reliability Warning Banners === */}
      {faultWarnings.length > 0 && (
        <div className="space-y-2">
          {faultWarnings.map((fault, idx) => (
            <motion.div
              key={fault.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl px-4 py-2.5 border transition-colors duration-500 ${
                fault.color === 'red'
                  ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/15'
                  : 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-black mt-0.5 ${
                  fault.color === 'red' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                }`}>!</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-black tracking-[0.05em] ${
                    fault.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {fault.label}
                  </div>
                  <div className={`text-xs font-medium mt-0.5 ${
                    fault.color === 'red' ? 'text-red-500/80 dark:text-red-400/70' : 'text-amber-500/80 dark:text-amber-400/70'
                  }`}>
                    {fault.detail}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Environmental Data Label */}
      <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
        {t('environmentalData')}
      </div>
      
      {/* 2x2 Grid */}
      <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] transition-colors duration-500">
        <div className="grid grid-cols-2">
          <div className={`px-3 py-3 border-r border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('temperature')}`}>
            <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('temperature')}</div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
              {isOnline && displayData.temperature !== null ? displayData.temperature.toFixed(1) : '--'}
              <span className="text-xs ml-0.5 font-bold text-[#4A5568] dark:text-[#94A3B8]">°C</span>
            </div>
          </div>
          <div className={`px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('humidity')}`}>
            <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('humidity')}</div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
              {isOnline && displayData.humidity !== null ? Math.floor(displayData.humidity) : '--'}
              <span className="text-xs ml-0.5 font-bold text-[#4A5568] dark:text-[#94A3B8]">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className={`px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('sunlight')}`}>
            <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('sunlight')}</div>
            <div className="text-base font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
              {isOnline && displayData.sunlight !== null ? sunlightLabel : '--'}
            </div>
          </div>
          <div className={`px-3 py-3 transition-colors duration-500 ${getPulseClass('rainDetected')}`}>
            <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('rainSensor')}</div>
            <div className={`text-base font-black tracking-tight ${
              !isOnline ? 'text-[#4A5568] dark:text-[#94A3B8]' :
              displayData.rainDetected ? 'text-[#6699CC]' : 'text-[#00386D] dark:text-[#F7FAFC]'
            }`} style={{ fontFamily: 'Space Grotesk' }}>
              {!isOnline ? '--' : displayData.rainDetected ? 'WET' : 'DRY'}
            </div>
          </div>
        </div>
      </div>

      {/* DRYER STATUS */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">DRYER STATUS</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              !isOnline || !systemOn ? 'bg-red-500' :
              systemState?.phase === 'flipping' || systemState?.phase === 'manual_flipping' ? 'bg-[#6699CC] animate-ping' :
              systemState?.isOffHours ? 'bg-amber-500' :
              systemState?.phase === 'env_cooldown' ? 'bg-[#6699CC] animate-pulse' :
              systemState?.phase?.startsWith('waiting_') ? 'bg-amber-500 animate-pulse' :
              'bg-emerald-500 animate-pulse'
            }`} />
            <div className={`text-sm font-black tracking-wide ${
              !isOnline || !systemOn ? 'text-red-500 dark:text-red-400' :
              systemState?.phase === 'flipping' || systemState?.phase === 'manual_flipping' ? 'text-[#6699CC]' :
              systemState?.isOffHours ? 'text-amber-600 dark:text-amber-400' :
              systemState?.phase === 'env_cooldown' ? 'text-[#6699CC]' :
              systemState?.phase?.startsWith('waiting_') ? 'text-amber-600 dark:text-amber-400' :
              'text-emerald-600 dark:text-emerald-400'
            }`} style={{ fontFamily: 'Space Grotesk' }}>
              {!isOnline ? 'DEVICE OFFLINE' :
               !systemOn ? 'POWERED OFF' :
               systemState?.isPaused ? 'PAUSED' :
               systemState?.coverClosed || displayData.rainDetected ? 'RAIN PROTECTION' :
               systemState?.phase === 'flipping' || systemState?.phase === 'manual_flipping' ? 'FLIPPING FISH' :
               systemState?.isOffHours ? 'OFF-HOURS (NIGHT HOLD)' :
               systemState?.phase === 'env_cooldown' ? 'DRYING (1-HR COOLDOWN)' :
               systemState?.phase === 'waiting_sun' ? 'HOLD: WAITING FOR SUN' :
               systemState?.phase === 'waiting_temp' ? 'HOLD: WAITING FOR HEAT' :
               systemState?.phase === 'waiting_humidity' ? 'HOLD: HIGH HUMIDITY' :
               'DRYING FISH'}
            </div>
          </div>
        </div>
      </div>

      {/* NEXT FLIP */}
      <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">
          {!isOnline ? 'SYSTEM STATUS' : !systemOn ? 'SYSTEM STATUS' : systemState?.isOffHours ? 'SOLAR DRYING SCHEDULE' : isEnvironment && systemState?.phase === 'env_cooldown' ? '1-HOUR DRYING COOLDOWN' : isEnvironment ? 'ENVIRONMENT REQUIREMENT' : (flipDisplay ? 'NEXT AUTO FLIP IN' : 'SYSTEM STATUS')}
        </div>
        <div className={`text-2xl font-black tracking-tight ${
          !isOnline ? 'text-red-500 dark:text-red-400' :
          !systemOn ? 'text-red-500 dark:text-red-400' :
          systemState?.isOffHours ? 'text-amber-600 dark:text-amber-400' :
          systemState?.phase === 'env_cooldown' ? 'text-[#6699CC]' :
          systemState?.phase?.startsWith('waiting_') ? 'text-amber-600 dark:text-amber-400' :
          flipDisplay ? 'text-[#00386D] dark:text-[#F7FAFC]' : 'text-[#6699CC]'
        }`} style={{ fontFamily: 'Space Grotesk' }}>
          {!isOnline ? 'OFFLINE' : !systemOn ? 'OFF' : systemState?.isOffHours ? 'RESUMES 7:00 AM' : (flipDisplay || 'AWAITING DATA')}
        </div>
        {isEnvironment && !systemState?.isOffHours && isOnline && systemOn && (
          <div className="text-xs font-medium text-[#4A5568] dark:text-[#94A3B8] mt-1">
            {systemState?.phase === 'env_cooldown'
              ? 'Fish drying on current side · 1-hour cooldown active before next eligible flip'
              : systemState?.phase?.startsWith('waiting_')
              ? '1-Hour cooldown finished · Waiting for Sun >= 70%, Temp >= 32°C, Humidity <= 65%'
              : 'Peak conditions met · Ready to flip'}
          </div>
        )}
        {systemState?.isOffHours && (
          <div className="text-xs font-medium text-[#4A5568] dark:text-[#94A3B8] mt-1">
            Flipping paused outside 7 AM – 4 PM sun window
          </div>
        )}
      </div>

      {/* POWER Button */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">POWER</div>
            <div className={`text-xs font-black mt-0.5 ${
              !isOnline ? 'text-red-500 dark:text-red-400' :
              systemOn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {!isOnline ? 'OFFLINE' : systemOn ? 'ON' : 'OFF'}
            </div>
          </div>
          <motion.button 
            onClick={handleSystemToggle} 
            whileTap={{ scale: 0.95 }}
            disabled={!isOnline}
            className={`px-6 py-2 rounded-xl font-black text-sm tracking-wide ${
              !isOnline ? 'bg-gray-400 dark:bg-gray-600 text-white/70 cursor-not-allowed' :
              systemOn ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {!isOnline ? 'OFFLINE' : systemOn ? 'TURN OFF' : 'TURN ON'}
          </motion.button>
        </div>
      </div>

      {/* Start New Batch Action Banner */}
      <motion.button
        type="button"
        onClick={onGoToControls}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.01 }}
        className="w-full py-4 rounded-2xl bg-[#00386D] hover:bg-[#002d57] text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-[#00386D]/25 border-2 border-[#6699CC]/40 flex items-center justify-center gap-2.5 transition-all"
      >
        <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-sm font-black">+</span>
        <span>START NEW DRYING BATCH</span>
        <span className="text-sm font-bold ml-1 text-[#6699CC] dark:text-white">→</span>
      </motion.button>

      {/* Quick Status Card */}
      <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] px-4 py-3 transition-colors duration-500">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">PROFILE</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-gray-400' : isDanggit ? 'bg-[#00386D] dark:bg-[#6699CC]' : 'bg-emerald-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{!isOnline ? '--' : isDanggit ? 'DANGGIT' : 'BOLINAO'}</span>
            </div>
          </div>
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">MODE</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-gray-400' : isEnvironment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{!isOnline ? '--' : isEnvironment ? 'ENV' : 'TIMER'}</span>
            </div>
          </div>
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">CYCLE</div>
            <div className="flex items-center justify-center gap-1">
              <svg className="w-3 h-3 text-[#4A5568] dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{getCycleDisplay()}</span>
            </div>
          </div>
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">COVER</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-gray-400' : coverClosed ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{!isOnline ? '--' : coverClosed ? 'CLOSED' : 'OPEN'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;