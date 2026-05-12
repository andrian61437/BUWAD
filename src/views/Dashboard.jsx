import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Dashboard = ({ sensorData, systemState, sunlightLabel, formatCountdown, t, onSystemToggle, isSystemOn }) => {
  const [pulseFields, setPulseFields] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const systemOn = isSystemOn !== undefined ? isSystemOn : true;

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
              <span className="text-xs font-black tracking-wide text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">
                CONNECTING...
              </span>
              <span className="text-xs font-black text-[#6699CC]">ESTABLISHING LINK</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
          {t('environmentalData')}
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 transition-colors duration-500">
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
                {t('temperature')}
              </div>
              <div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
            <div className="px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
                {t('humidity')}
              </div>
              <div className="h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
                {t('sunlight')}
              </div>
              <div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
            <div className="px-3 py-3 transition-colors duration-500">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
                {t('rainSensor')}
              </div>
              <div className="h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
          <div className="flex justify-between items-center">
            <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
              {t('systemState')}
            </div>
            <div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
          <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
            NEXT AUTO FLIP IN
          </div>
          <div className="h-8 w-24 mx-auto bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
        </div>

        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
                POWER
              </div>
              <div className="h-4 w-8 mt-0.5 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
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
              !systemOn 
                ? 'text-red-500 dark:text-red-400'
                : displayData.rainDetected 
                  ? 'text-[#6699CC]' 
                  : 'text-[#00386D] dark:text-[#F7FAFC]'
            }`}>
              {!systemOn ? 'SYSTEM OFFLINE' : t('rainDetected')}
            </span>
            <span className={`text-xs font-black transition-colors duration-500 ${
              !systemOn 
                ? 'text-red-500 dark:text-red-400'
                : 'text-[#6699CC]'
            }`}>
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
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
              {t('temperature')}
            </div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
              {displayData.temperature.toFixed(1)}<span className="text-[10px] ml-0.5 text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">°C</span>
            </div>
          </div>
          <div className={`px-3 py-3 border-b border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('humidity')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
              {t('humidity')}
            </div>
            <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
              {Math.floor(displayData.humidity)}<span className="text-[10px] ml-0.5 text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className={`px-3 py-3 border-r border-[#BDBCBD] dark:border-white/10 transition-colors duration-500 ${getPulseClass('sunlight')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
              {t('sunlight')}
            </div>
            <div className="text-base font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
              {sunlightLabel}
            </div>
          </div>
          <div className={`px-3 py-3 transition-colors duration-500 ${getPulseClass('rainDetected')}`}>
            <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
              {t('rainSensor')}
            </div>
            <div className={`text-base font-black tracking-tight transition-colors duration-500 ${
              displayData.rainDetected ? 'text-[#6699CC]' : 'text-[#00386D] dark:text-[#F7FAFC]'
            }`} style={{ fontFamily: 'Space Grotesk' }}>
              {displayData.rainDetected ? 'WET' : 'DRY'}
            </div>
          </div>
        </div>
      </div>

      {/* System State */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
            {t('systemState')}
          </div>
          <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
            {systemOn ? t('phase2ActiveFlipping') : 'POWERED OFF'}
          </div>
        </div>
      </div>

      {/* NEXT FLIP */}
      <div className="rounded-2xl px-4 py-3 text-center bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1 transition-colors duration-500">
          {!systemOn ? 'SYSTEM STATUS' : (flipDisplay ? 'NEXT AUTO FLIP IN' : 'SYSTEM STATUS')}
        </div>
        <div className={`text-2xl font-black tracking-tight transition-colors duration-500 ${
          !systemOn ? 'text-red-500 dark:text-red-400' :
          flipDisplay 
            ? 'text-[#00386D] dark:text-[#F7FAFC]' 
            : 'text-[#6699CC]'
        }`} style={{ fontFamily: 'Space Grotesk' }}>
          {!systemOn ? 'OFF' : (flipDisplay || 'AWAITING DATA')}
        </div>
      </div>

      {/* POWER Button */}
      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
              POWER
            </div>
            <div className={`text-xs font-black mt-0.5 transition-colors duration-500 ${
              systemOn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {systemOn ? 'ON' : 'OFF'}
            </div>
          </div>
          
          <motion.button
            onClick={handleSystemToggle}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 rounded-xl font-black text-sm tracking-wide transition-colors duration-500 ${
              systemOn 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
            }`}
          >
            {systemOn ? 'TURN OFF' : 'TURN ON'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;