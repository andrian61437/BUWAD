import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Controls = ({ 
  dryingMode, 
  flipMode, 
  onDryingModeToggle, 
  onFlipModeToggle, 
  onManualOverride,
  t 
}) => {
  const [isManualFliping, setIsManualFliping] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [localDryingMode, setLocalDryingMode] = useState(dryingMode || 'danggit');
  const [localFlipMode, setLocalFlipMode] = useState(flipMode || 'timer');
  const lastClickTimeRef = useRef(0);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (dryingMode && dryingMode !== localDryingMode) {
      setLocalDryingMode(dryingMode);
    }
  }, [dryingMode]);

  useEffect(() => {
    if (flipMode && flipMode !== localFlipMode) {
      setLocalFlipMode(flipMode);
    }
  }, [flipMode]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerToast = useCallback((msg) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimeoutRef.current = null;
    }, 1800);
  }, []);

  const handleDryingSelect = useCallback((mode) => {
    if (mode === localDryingMode) return;
    setLocalDryingMode(mode);
    onDryingModeToggle?.(mode);
    triggerToast(`Switched to ${mode === 'danggit' ? 'Danggit' : 'Bolinao'}`);
  }, [localDryingMode, onDryingModeToggle, triggerToast]);

  const handleFlipModeSelect = useCallback((mode) => {
    if (mode === localFlipMode) return;
    setLocalFlipMode(mode);
    onFlipModeToggle?.(mode);
    triggerToast(`Switched to ${mode === 'environment' ? 'Environment-Based' : 'Timer-Based'} flipping`);
  }, [localFlipMode, onFlipModeToggle, triggerToast]);

  const handleManualFlip = useCallback(() => {
    const now = Date.now();
    
    if (now - lastClickTimeRef.current < 2000) {
      return;
    }
    
    lastClickTimeRef.current = now;
    
    setIsManualFliping(true);
    
    onManualOverride?.();
    
    setTimeout(() => {
      setIsManualFliping(false);
      triggerToast('Fish flipped successfully');
    }, 800);
  }, [onManualOverride, triggerToast]);

  const isDanggit = localDryingMode === 'danggit';
  const isEnvironment = localFlipMode === 'environment';

  const getCycleDisplay = () => {
    if (isEnvironment) {
      return 'Adaptive';
    }
    return isDanggit ? '38s' : '22s';
  };

  const toastPortal = createPortal(
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
          className="fixed top-20 left-4 right-4 z-[200] flex justify-center pointer-events-none"
        >
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl bg-[#00386D] dark:bg-[#1A202C] text-white border border-white/10 transition-colors duration-500">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 600 }}
              className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">{toastMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      {toastPortal}
      <div className="space-y-4">
        {/* Fish Profile Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
                {t('dryingParameters')}
              </div>
              <div className="flex items-center gap-1.5">
                <motion.span 
                  className="w-1.5 h-1.5 rounded-full bg-[#6699CC]"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <span className="text-[9px] font-bold text-[#6699CC] tracking-wider transition-colors duration-500">
                  {isDanggit ? 'THICK FILLET' : 'SMALL MASS'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="relative flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 min-h-[64px] overflow-hidden transition-colors duration-500">
              <motion.div
                layoutId="fishTypePill"
                className="absolute top-1 bottom-1 bg-[#00386D] dark:bg-[#6699CC] rounded-[10px] shadow-lg transition-colors duration-500"
                style={{ 
                  width: 'calc(50% - 4px)',
                  left: isDanggit ? '4px' : '50%'
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 28,
                  mass: 0.8,
                }}
              />

              <button
                type="button"
                onClick={() => handleDryingSelect('danggit')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-[10px] transition-colors duration-500 ${
                  isDanggit 
                    ? 'text-white' 
                    : 'text-[#00386D] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-[#F7FAFC]'
                }`}
              >
                <span className="text-sm font-black tracking-wide leading-tight">
                  {t('danggit')}
                </span>
                <span className="text-[9px] font-medium mt-0.5 opacity-80">
                  Rabbitfish
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDryingSelect('bolinao')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-[10px] transition-colors duration-500 ${
                  !isDanggit 
                    ? 'text-white' 
                    : 'text-[#00386D] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-[#F7FAFC]'
                }`}
              >
                <span className="text-sm font-black tracking-wide leading-tight">
                  {t('bolinao')}
                </span>
                <span className="text-[9px] font-medium mt-0.5 opacity-80">
                  Anchovies
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Flipping Mode Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
                {t('flippingMode')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isEnvironment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-[9px] font-bold tracking-wider transition-colors duration-500 ${isEnvironment ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isEnvironment ? 'SENSOR-DRIVEN' : 'FIXED INTERVAL'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 pb-5">
            <div className="relative flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 min-h-[64px] overflow-hidden transition-colors duration-500">
              <motion.div
                layoutId="flipModePill"
                className="absolute top-1 bottom-1 bg-[#00386D] dark:bg-[#6699CC] rounded-[10px] shadow-lg transition-colors duration-500"
                style={{ 
                  width: 'calc(50% - 4px)',
                  left: isEnvironment ? '4px' : '50%'
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 28,
                  mass: 0.8,
                }}
              />

              <button
                type="button"
                onClick={() => handleFlipModeSelect('environment')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[10px] transition-colors duration-500 ${
                  isEnvironment 
                    ? 'text-white' 
                    : 'text-[#00386D] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-[#F7FAFC]'
                }`}
              >
                <span className="text-xs font-black tracking-wide leading-tight text-center">
                  {t('environmentBased')}
                </span>
                <span className="text-[8px] font-medium mt-0.5 opacity-80 text-center">
                  Sensor-driven
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFlipModeSelect('timer')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[10px] transition-colors duration-500 ${
                  !isEnvironment 
                    ? 'text-white' 
                    : 'text-[#00386D] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-[#F7FAFC]'
                }`}
              >
                <span className="text-xs font-black tracking-wide leading-tight text-center">
                  {t('timerBased')}
                </span>
                <span className="text-[8px] font-medium mt-0.5 opacity-80 text-center">
                  Fixed cycle
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Manual Flip Section */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 overflow-hidden transition-colors duration-500">
          <div className="px-5 pt-5 pb-2">
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
              {t('flipMechanism')}
            </div>
          </div>
          
          <div className="px-3 pb-3">
            <motion.button
              type="button"
              onClick={handleManualFlip}
              disabled={isManualFliping}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.005 }}
              className={`w-full py-6 rounded-xl font-black text-base tracking-wide transition-colors duration-500 relative overflow-hidden ${
                isManualFliping
                  ? 'bg-[#00386D]/40 dark:bg-[#6699CC]/40 text-white/70 cursor-not-allowed'
                  : 'bg-[#00386D] dark:bg-[#6699CC] text-white hover:bg-[#002244] dark:hover:bg-[#5588BB] shadow-lg shadow-[#00386D]/20 dark:shadow-[#6699CC]/20'
              }`}
            >
              {isManualFliping && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isManualFliping ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="tracking-wider">EXECUTING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="tracking-wider">{t('manualOverride')}</span>
                  </>
                )}
              </span>
            </motion.button>
          </div>

          <div className="px-5 pb-5">
            <div className="text-center">
              <div className="text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.05em] transition-colors duration-500">
                {t('triggersImmediateFlip')}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Status Card */}
        <div className="rounded-2xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 p-5 transition-colors duration-500">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1.5 transition-colors duration-500">
                PROFILE
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00386D]/10 dark:bg-[#6699CC]/10 transition-colors duration-500">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isDanggit ? 'bg-[#00386D] dark:bg-[#6699CC]' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">
                  {isDanggit ? 'DANGGIT' : 'BOLINAO'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1.5 transition-colors duration-500">
                MODE
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 transition-colors duration-500">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isEnvironment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">
                  {isEnvironment ? 'ENV' : 'TIMER'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-1.5 transition-colors duration-500">
                CYCLE
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 transition-colors duration-500">
                <svg className="w-3 h-3 text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">
                  {getCycleDisplay()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Controls;