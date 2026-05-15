import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Dashboard = ({ sensorData, systemState, sunlightLabel, formatCountdown, t, onSystemToggle, isSystemOn }) => {
  const [pulseFields, setPulseFields] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const systemOn = isSystemOn !== undefined ? isSystemOn : true;
  const dryingMode = systemState?.dryingMode || 'danggit';
  const flipMode = systemState?.flipMode || 'timer';
  const coverClosed = systemState?.coverClosed || false;
  const isDanggit = dryingMode === 'danggit';
  const isEnvironment = flipMode === 'environment';

  useEffect(() => {
    if (sensorData && typeof sensorData.temperature === 'number') {
      const timer = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(timer);
    }
  }, [sensorData]);

  const hasSensorData = sensorData && 
    typeof sensorData.temperature === 'number' && 
    sensorData.temperature !== 0 &&
    sensorData.humidity !== 0;
  
  const displayData = {
    temperature: sensorData?.temperature ?? 32.4,
    humidity: sensorData?.humidity ?? 65,
    sunlight: sensorData?.sunlight ?? 78,
    rainDetected: sensorData?.rainDetected ?? false,
    phase: systemState?.phase ?? 'activeflipping',
    nextFlip: systemState?.nextFlip ?? 0
  };

  useEffect(() => {
    if (isLoading) return;
    const fields = ['temperature', 'humidity', 'sunlight', 'rainDetected'];
    fields.forEach(field => {
      setPulseFields(prev => ({ ...prev, [field]: true }));
      setTimeout(() => {
        setPulseFields(prev => ({ ...prev, [field]: false }));
      }, 300);
    });
  }, [sensorData, isLoading]);

  const getPulseClass = (field) => {
    if (isLoading) return '';
    return pulseFields[field] ? 'sensor-pulse' : '';
  };

  const getFlipDisplay = () => {
    if (!systemOn) return null;
    if (!hasSensorData) return null;
    if (!displayData.nextFlip || displayData.nextFlip <= 0 || isNaN(displayData.nextFlip)) {
      return null;
    }
    return formatCountdown(displayData.nextFlip);
  };

  const flipDisplay = getFlipDisplay();

  const getCycleDisplay = () => {
    if (isEnvironment) return 'Adaptive';
    return isDanggit ? '15s' : '10s';
  };

  const handleSystemToggle = () => {
    if (onSystemToggle) {
      onSystemToggle(!systemOn);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 transition-colors duration-500">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black tracking-wide text-[#00386D] dark:text-[#F7FAFC]">CONNECTING...</span>
              <span className="text-xs font-black text-[#6699CC]">ESTABLISHING LINK</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('environmentalData')}</div>
        <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80">
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-b border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('temperature')}</div><div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
            <div className="px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('humidity')}</div><div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
          </div>
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('sunlight')}</div><div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
            <div className="px-3 py-3"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('rainSensor')}</div><div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
          </div>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10"><div className="flex justify-between items-center"><div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('systemState')}</div><div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div></div>
        <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10"><div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">NEXT AUTO FLIP IN</div><div className="h-8 w-24 mx-auto bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div>
        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10"><div className="flex justify-between items-center"><div><div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">POWER</div><div className="h-4 w-8 mt-0.5 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /></div><div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" /></div></div>
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
          !systemOn 
            ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/20'
            : displayData.rainDetected 
              ? 'border-[#6699CC]/50 bg-[#6699CC]/10 dark:bg-[#6699CC]/20' 
              : 'border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80'
        }`}
      >
        <div className="px-4 py-2">
          <div className="flex justify-between items-center">
            <span className={`text-xs font-black tracking-wide transition-colors duration-500 ${
              !systemOn ? 'text-red-500 dark:text-red-400' :
              displayData.rainDetected ? 'text-[#6699CC]' : 'text-[#00386D] dark:text-[#F7FAFC]'
            }`}>
              {!systemOn ? 'SYSTEM OFFLINE' : t('rainDetected')}
            </span>
            <span className={`text-xs font-black transition-colors duration-500 ${!systemOn ? 'text-red-500 dark:text-red-400' : 'text-[#6699CC]'}`}>
              {!systemOn ? 'PRESS TURN ON TO START' : t('enclosureSecured')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Environmental Data Label */}
      <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
        {t('environmentalData')}
      </div>
      
      {/* 2x2 Grid */}
      <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 transition-colors duration-500">
        <div className="grid grid-cols-2">
          <div className={`px-3 py-3 border-r border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('temperature')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('temperature')}</div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
              {displayData.temperature.toFixed(1)}<span className="text-[10px] ml-0.5 text-[#4A5568] dark:text-[#94A3B8]">°C</span>
            </div>
          </div>
          <div className={`px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('humidity')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('humidity')}</div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
              {Math.floor(displayData.humidity)}<span className="text-[10px] ml-0.5 text-[#4A5568] dark:text-[#94A3B8]">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className={`px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('sunlight')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('sunlight')}</div>
            <div className="text-base font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{sunlightLabel}</div>
          </div>
          <div className={`px-3 py-3 transition-colors duration-500 ${getPulseClass('rainDetected')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">{t('rainSensor')}</div>
            <div className={`text-base font-black tracking-tight ${displayData.rainDetected ? 'text-[#6699CC]' : 'text-[#00386D] dark:text-[#F7FAFC]'}`} style={{ fontFamily: 'Space Grotesk' }}>
              {displayData.rainDetected ? 'WET' : 'DRY'}
            </div>
          </div>
        </div>
      </div>

      {/* System State */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('systemState')}</div>
          <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC]" style={{ fontFamily: 'Space Grotesk' }}>
            {systemOn ? t('phase2ActiveFlipping') : 'POWERED OFF'}
          </div>
        </div>
      </div>

      {/* NEXT FLIP */}
      <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">
          {!systemOn ? 'SYSTEM STATUS' : (flipDisplay ? 'NEXT AUTO FLIP IN' : 'SYSTEM STATUS')}
        </div>
        <div className={`text-2xl font-black tracking-tight ${!systemOn ? 'text-red-500 dark:text-red-400' : flipDisplay ? 'text-[#00386D] dark:text-[#F7FAFC]' : 'text-[#6699CC]'}`} style={{ fontFamily: 'Space Grotesk' }}>
          {!systemOn ? 'OFF' : (flipDisplay || 'AWAITING DATA')}
        </div>
      </div>

      {/* POWER Button */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">POWER</div>
            <div className={`text-xs font-black mt-0.5 ${systemOn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {systemOn ? 'ON' : 'OFF'}
            </div>
          </div>
          <motion.button onClick={handleSystemToggle} whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 rounded-xl font-black text-sm tracking-wide ${systemOn ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {systemOn ? 'TURN OFF' : 'TURN ON'}
          </motion.button>
        </div>
      </div>

      {/* Quick Status Card */}
      <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 px-4 py-3 transition-colors duration-500">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">PROFILE</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isDanggit ? 'bg-[#00386D] dark:bg-[#6699CC]' : 'bg-emerald-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{isDanggit ? 'DANGGIT' : 'BOLINAO'}</span>
            </div>
          </div>
          <div>
            <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1">MODE</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isEnvironment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{isEnvironment ? 'ENV' : 'TIMER'}</span>
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
              <span className={`w-1.5 h-1.5 rounded-full ${coverClosed ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-[11px] font-black text-[#00386D] dark:text-[#F7FAFC]">{coverClosed ? 'CLOSED' : 'OPEN'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;