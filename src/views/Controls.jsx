import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Controls = ({ 
  dryingMode, 
  flipMode,
  coverClosed,
  timerInterval,
  danggitTimer = 15,
  bolinaoTimer = 10,
  onDryingModeToggle, 
  onFlipModeToggle, 
  onTimerIntervalChange,
  onManualOverride,
  onCoverToggle,
  isDeviceOnline,
  t 
}) => {
  const [isManualFliping, setIsManualFliping] = useState(false);
  const [isManualCover, setIsManualCover] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);
  const isOnline = isDeviceOnline !== undefined ? isDeviceOnline : true;

  const currentDryingMode = dryingMode || 'danggit';
  const currentFlipMode = flipMode || 'timer';
  const isCoverClosed = coverClosed || false;
  const isDanggit = currentDryingMode === 'danggit';

  // Independent saved timer interval for the active profile
  const activeProfileTimer = isDanggit ? (danggitTimer || 15) : (bolinaoTimer || 10);
  const currentTimerInterval = timerInterval || activeProfileTimer;

  const [showTimerModal, setShowTimerModal] = useState(false);
  const initialHours = Math.floor(currentTimerInterval / 3600);
  const initialMinutes = Math.floor((currentTimerInterval % 3600) / 60);
  const initialSeconds = currentTimerInterval % 60;

  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [selectedSeconds, setSelectedSeconds] = useState(initialSeconds);

  const [modalHours, setModalHours] = useState(initialHours);
  const [modalMinutes, setModalMinutes] = useState(initialMinutes);
  const [modalSeconds, setModalSeconds] = useState(initialSeconds);

  useEffect(() => {
    const targetTimer = isDanggit ? (danggitTimer || 15) : (bolinaoTimer || 10);
    const hrs = Math.floor(targetTimer / 3600);
    const mins = Math.floor((targetTimer % 3600) / 60);
    const secs = targetTimer % 60;
    setSelectedHours(hrs);
    setSelectedMinutes(mins);
    setSelectedSeconds(secs);
    setModalHours(hrs);
    setModalMinutes(mins);
    setModalSeconds(secs);
  }, [currentDryingMode, danggitTimer, bolinaoTimer, isDanggit]);

  useEffect(() => {
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, []);

  const triggerToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => { setShowToast(false); toastTimeoutRef.current = null; }, 1800);
  }, []);

  const handleDryingSelect = useCallback((mode) => {
    if (!isOnline) {
      triggerToast('Cannot change profile — ESP32 is offline');
      return;
    }
    if (mode === currentDryingMode) return;
    onDryingModeToggle?.(mode);
    const savedTime = mode === 'danggit' ? (danggitTimer || 15) : (bolinaoTimer || 10);
    const timeLabel = savedTime >= 60 
      ? (Math.floor(savedTime / 60) + 'm') 
      : (savedTime + 's');
    triggerToast(`Switched to ${mode === 'danggit' ? 'Danggit' : 'Bolinao'} (${timeLabel} timer)`);
  }, [currentDryingMode, danggitTimer, bolinaoTimer, onDryingModeToggle, triggerToast, isOnline]);

  const handleFlipModeSelect = useCallback((mode) => {
    if (!isOnline) {
      triggerToast('Cannot change mode — ESP32 is offline');
      return;
    }
    if (mode === currentFlipMode) return;
    onFlipModeToggle?.(mode);
    triggerToast(`Switched to ${mode === 'environment' ? 'Environment-Based' : 'Timer-Based'} flipping`);
  }, [currentFlipMode, onFlipModeToggle, triggerToast, isOnline]);

  const openTimerModal = useCallback(() => {
    if (!isOnline) {
      triggerToast('Cannot change timer — ESP32 is offline');
      return;
    }
    setModalHours(selectedHours);
    setModalMinutes(selectedMinutes);
    setModalSeconds(selectedSeconds);
    setShowTimerModal(true);
  }, [isOnline, selectedHours, selectedMinutes, selectedSeconds, triggerToast]);

  const handleApplyModalTimer = useCallback(() => {
    if (!isOnline) {
      triggerToast('Cannot change timer — ESP32 is offline');
      return;
    }
    let totalSeconds = (modalHours * 3600) + (modalMinutes * 60) + modalSeconds;
    if (totalSeconds < 5) totalSeconds = 5; // Minimum 5s
    setSelectedHours(modalHours);
    setSelectedMinutes(modalMinutes);
    setSelectedSeconds(modalSeconds);
    onTimerIntervalChange?.(totalSeconds, currentDryingMode);
    setShowTimerModal(false);
    
    let label = '';
    if (modalHours > 0) label += `${modalHours}h `;
    if (modalMinutes > 0) label += `${modalMinutes}m `;
    if (modalSeconds > 0 || label === '') label += `${modalSeconds}s`;
    label = label.trim();

    const profileName = isDanggit ? 'Danggit' : 'Bolinao';
    triggerToast(`${profileName} timer set to ${label}`);
  }, [isOnline, modalHours, modalMinutes, modalSeconds, onTimerIntervalChange, currentDryingMode, isDanggit, triggerToast]);

  const handleManualFlip = useCallback(() => {
    if (!isOnline) {
      triggerToast('ESP32 is offline');
      return;
    }
    setIsManualFliping(true);
    onManualOverride?.();
    setTimeout(() => { setIsManualFliping(false); triggerToast('Fish flipped successfully'); }, 800);
  }, [onManualOverride, triggerToast, isOnline]);

  const handleCoverToggle = useCallback(() => {
    if (!isOnline) {
      triggerToast('ESP32 is offline');
      return;
    }
    setIsManualCover(true);
    onCoverToggle?.();
    setTimeout(() => { setIsManualCover(false); triggerToast(isCoverClosed ? 'Cover opened' : 'Cover closed'); }, 800);
  }, [isCoverClosed, onCoverToggle, triggerToast, isOnline]);

  const isEnvironment = currentFlipMode === 'environment';

  const hoursOptions = Array.from({ length: 13 }, (_, i) => i); // 0 to 12 hours
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i); // 0 to 59 minutes
  const secondsOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]; // 0 to 55s

  const presets = [
    { label: '10s', hrs: 0, mins: 0, secs: 10 },
    { label: '15s', hrs: 0, mins: 0, secs: 15 },
    { label: '30s', hrs: 0, mins: 0, secs: 30 },
    { label: '1m', hrs: 0, mins: 1, secs: 0 },
    { label: '15m', hrs: 0, mins: 15, secs: 0 },
    { label: '30m', hrs: 0, mins: 30, secs: 0 },
    { label: '1h', hrs: 1, mins: 0, secs: 0 }
  ];

  const currentDurationLabel = (hrs = modalHours, mins = modalMinutes, secs = modalSeconds) => {
    let parts = [];
    if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`);
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs || 15}s`);
    return parts.join(' ');
  };

  const toastPortal = createPortal(
    <AnimatePresence>
      {showToast && (
        <motion.div initial={{ opacity: 0, y: -40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40, scale: 0.92 }} transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }} className="fixed top-20 left-4 right-4 z-[200] flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl bg-[#00386D] dark:bg-[#1A202C] text-white border border-white/10">
            <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 600 }} className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></motion.div>
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">{toastMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  const timerModalPortal = createPortal(
    <AnimatePresence>
      {showTimerModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTimerModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#1A202C] border border-[#BDBCBD] dark:border-white/10 shadow-2xl overflow-hidden p-5 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC]">
                  {isDanggit ? 'DANGGIT FLIP TIMER' : 'BOLINAO FLIP TIMER'}
                </h3>
                <p className="text-[10px] font-medium text-[#4A5568] dark:text-[#94A3B8]">
                  {isDanggit ? 'Saved auto-flip interval for Danggit' : 'Saved auto-flip interval for Bolinao'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[#4A5568] dark:text-[#94A3B8] hover:text-red-500 text-sm font-black"
              >
                ✕
              </button>
            </div>
            <div className="text-center py-2 bg-[#00386D]/5 dark:bg-[#6699CC]/10 rounded-2xl border border-[#00386D]/10 dark:border-white/5">
              <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">SELECTED DURATION</div>
              <div className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                {currentDurationLabel(modalHours, modalMinutes, modalSeconds)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 px-1">QUICK PRESETS</div>
              <div className="grid grid-cols-7 gap-1">
                {presets.map((p) => {
                  const isSelected = modalHours === p.hrs && modalMinutes === p.mins && modalSeconds === p.secs;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setModalHours(p.hrs); setModalMinutes(p.mins); setModalSeconds(p.secs); }}
                      className={`py-1.5 rounded-xl text-[10px] font-black transition-colors ${
                        isSelected
                          ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-white/5 text-[#00386D] dark:text-[#94A3B8] hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-[#121620] p-3 rounded-2xl border border-gray-200 dark:border-white/5">
              <div>
                <div className="text-[9px] font-black text-center text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">HOURS</div>
                <div className="h-32 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10">
                  {hoursOptions.map((h) => {
                    const active = modalHours === h;
                    return (
                      <button
                        key={`modal-hr-${h}`}
                        type="button"
                        onClick={() => setModalHours(h)}
                        className={`w-full py-1.5 rounded-xl text-center font-black text-xs transition-all ${
                          active
                            ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                            : 'text-[#00386D] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-white/5'
                        }`}
                      >
                        {h} {h === 1 ? 'hr' : 'hrs'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-center text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">MINS</div>
                <div className="h-32 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10">
                  {minutesOptions.map((m) => {
                    const active = modalMinutes === m;
                    return (
                      <button
                        key={`modal-min-${m}`}
                        type="button"
                        onClick={() => setModalMinutes(m)}
                        className={`w-full py-1.5 rounded-xl text-center font-black text-xs transition-all ${
                          active
                            ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                            : 'text-[#00386D] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-white/5'
                        }`}
                      >
                        {m}m
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-center text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">SECS</div>
                <div className="h-32 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10">
                  {secondsOptions.map((s) => {
                    const active = modalSeconds === s;
                    return (
                      <button
                        key={`modal-sec-${s}`}
                        type="button"
                        onClick={() => setModalSeconds(s)}
                        className={`w-full py-1.5 rounded-xl text-center font-black text-xs transition-all ${
                          active
                            ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                            : 'text-[#00386D] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-white/5'
                        }`}
                      >
                        {s}s
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-[#4A5568] dark:text-[#94A3B8] font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <motion.button
                type="button"
                onClick={handleApplyModalTimer}
                whileTap={{ scale: 0.97 }}
                className="flex-[2] py-3 rounded-2xl bg-[#00386D] dark:bg-[#6699CC] text-white font-black text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm & Set
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      {toastPortal}
      {timerModalPortal}
      <div className="space-y-4">
        {!isOnline && (
          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 px-4 py-3 text-center transition-colors duration-500">
            <div className="text-[10px] font-black text-red-600 dark:text-red-400">ESP32 OFFLINE</div>
            <div className="text-[9px] font-medium text-red-600/80 dark:text-red-300 mt-0.5">Controls disabled — Device disconnected</div>
          </div>
        )}
        {/* Fish Profile Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('dryingParameters')}</div>
              <div className="flex items-center gap-1.5">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-[#6699CC]" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                <span className="text-[9px] font-bold text-[#6699CC] tracking-wider">{isDanggit ? t('thickFillet') : t('smallMass')}</span>
              </div>
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="relative flex bg-gray-100 dark:bg-[#121620] rounded-xl p-1 min-h-[64px] overflow-hidden">
              <div
                className="absolute top-1 bottom-1 bg-[#00386D] dark:bg-[#6699CC] rounded-[10px] shadow-lg transition-all duration-300 ease-out"
                style={{
                  width: 'calc(50% - 4px)',
                  left: isDanggit ? '4px' : 'calc(50% + 0px)'
                }}
              />
              <button
                type="button"
                onClick={() => handleDryingSelect('danggit')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-[10px] transition-colors duration-300 ${
                  isDanggit ? 'text-white' : 'text-[#00386D] dark:text-[#CBD5E1]'
                }`}
              >
                <span className="text-sm font-black tracking-wide leading-tight">{t('danggit')}</span>
                <span className={`text-[9px] font-medium mt-0.5 ${isDanggit ? 'text-white/80' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>
                  {t('rabbitfishThickFillet')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDryingSelect('bolinao')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-[10px] transition-colors duration-300 ${
                  !isDanggit ? 'text-white' : 'text-[#00386D] dark:text-[#CBD5E1]'
                }`}
              >
                <span className="text-sm font-black tracking-wide leading-tight">{t('bolinao')}</span>
                <span className={`text-[9px] font-medium mt-0.5 ${!isDanggit ? 'text-white/80' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>
                  {t('anchoviesSmallMass')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Flipping Mode Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('flippingMode')}</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isEnvironment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-[9px] font-bold tracking-wider ${isEnvironment ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isEnvironment ? t('sensorDrivenLabel') : t('fixedIntervalLabel')}
                </span>
              </div>
            </div>
          </div>
          <div className="px-3 pb-5">
            <div className="relative flex bg-gray-100 dark:bg-[#121620] rounded-xl p-1 min-h-[64px] overflow-hidden">
              <div
                className="absolute top-1 bottom-1 bg-[#00386D] dark:bg-[#6699CC] rounded-[10px] shadow-lg transition-all duration-300 ease-out"
                style={{
                  width: 'calc(50% - 4px)',
                  left: isEnvironment ? '4px' : 'calc(50% + 0px)'
                }}
              />
              <button
                type="button"
                onClick={() => handleFlipModeSelect('environment')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[10px] transition-colors duration-300 ${
                  isEnvironment ? 'text-white' : 'text-[#00386D] dark:text-[#CBD5E1]'
                }`}
              >
                <span className="text-xs font-black tracking-wide leading-tight text-center">{t('environmentBased')}</span>
                <span className={`text-[8px] font-medium mt-0.5 text-center ${isEnvironment ? 'text-white/80' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>
                  {t('sensorDriven')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleFlipModeSelect('timer')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[10px] transition-colors duration-300 ${
                  !isEnvironment ? 'text-white' : 'text-[#00386D] dark:text-[#CBD5E1]'
                }`}
              >
                <span className="text-xs font-black tracking-wide leading-tight text-center">{t('timerBased')}</span>
                <span className={`text-[8px] font-medium mt-0.5 text-center ${!isEnvironment ? 'text-white/80' : 'text-[#4A5568] dark:text-[#94A3B8]'}`}>
                  {t('fixedInterval')}
                </span>
              </button>
            </div>

            {/* Compact Timer Row (Pop-up trigger) */}
            {!isEnvironment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between px-1"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00386D]/10 dark:bg-[#6699CC]/15 flex items-center justify-center text-[#00386D] dark:text-[#6699CC]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">CURRENT INTERVAL</div>
                    <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC]">{currentDurationLabel()}</div>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={openTimerModal}
                  whileTap={{ scale: 0.95 }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00386D] dark:bg-[#6699CC] text-white font-black text-xs tracking-wider uppercase shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  SET TIMER
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Manual Flip Section - Hidden when cover is closed */}
        {!isCoverClosed && (
          <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden transition-colors duration-500">
            <div className="px-5 pt-5 pb-2">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">{t('flipMechanism')}</div>
            </div>
            <div className="px-3 pb-3">
              <motion.button type="button" onClick={handleManualFlip} disabled={isManualFliping} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.005 }}
                className={`w-full py-6 rounded-xl font-black text-base tracking-wide relative overflow-hidden ${isManualFliping ? 'bg-[#00386D]/40 dark:bg-[#6699CC]/40 text-white/70 cursor-not-allowed' : 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-lg'}`}>
                {isManualFliping && <motion.div className="absolute inset-0 bg-white/20" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 0.8 }} />}
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isManualFliping ? (
                    <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>{t('executing')}</span></>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>{t('manualOverride')}</span></>
                  )}
                </span>
              </motion.button>
            </div>
          </div>
        )}

        {/* Cover closed warning when Flip Now is hidden */}
        {isCoverClosed && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/20 px-4 py-3 text-center transition-colors duration-500">
            <div className="text-[10px] font-black text-red-600 dark:text-red-400">FLIP DISABLED</div>
            <div className="text-[9px] font-medium text-red-600/80 dark:text-red-300 mt-0.5">{t('coverIsOn')} — Open cover to enable flipping</div>
          </div>
        )}

        {/* Cover Control Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em]">COVER CONTROL</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isCoverClosed ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className={`text-[9px] font-bold tracking-wider ${isCoverClosed ? 'text-red-500' : 'text-green-500'}`}>{isCoverClosed ? 'CLOSED' : 'OPEN'}</span>
              </div>
            </div>
          </div>
          <div className="px-3 pb-3">
            <motion.button type="button" onClick={handleCoverToggle} disabled={isManualCover} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.005 }}
              className={`w-full py-6 rounded-xl font-black text-base tracking-wide relative overflow-hidden ${isManualCover ? 'bg-gray-400/40 text-white/70 cursor-not-allowed' : isCoverClosed ? 'bg-green-600 text-white shadow-lg' : 'bg-red-500 text-white shadow-lg'}`}>
              {isManualCover && <motion.div className="absolute inset-0 bg-white/20" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 0.8 }} />}
              <span className="relative z-10 flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                <span>{isCoverClosed ? 'OPEN COVER' : 'CLOSE COVER'}</span>
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Controls;