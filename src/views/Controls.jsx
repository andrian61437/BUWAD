import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Controls = ({ 
  dryingMode, 
  flipMode,
  coverClosed,
  onDryingModeToggle, 
  onFlipModeToggle, 
  onManualOverride,
  onCoverToggle,
  t 
}) => {
  const [isManualFliping, setIsManualFliping] = useState(false);
  const [isManualCover, setIsManualCover] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  const currentDryingMode = dryingMode || 'danggit';
  const currentFlipMode = flipMode || 'timer';
  const isCoverClosed = coverClosed || false;

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
    if (mode === currentDryingMode) return;
    onDryingModeToggle?.(mode);
    triggerToast(`Switched to ${mode === 'danggit' ? 'Danggit' : 'Bolinao'}`);
  }, [currentDryingMode, onDryingModeToggle, triggerToast]);

  const handleFlipModeSelect = useCallback((mode) => {
    if (mode === currentFlipMode) return;
    onFlipModeToggle?.(mode);
    triggerToast(`Switched to ${mode === 'environment' ? 'Environment-Based' : 'Timer-Based'} flipping`);
  }, [currentFlipMode, onFlipModeToggle, triggerToast]);

  const handleManualFlip = useCallback(() => {
    setIsManualFliping(true);
    onManualOverride?.();
    setTimeout(() => { setIsManualFliping(false); triggerToast('Fish flipped successfully'); }, 800);
  }, [onManualOverride, triggerToast]);

  const handleCoverToggle = useCallback(() => {
    setIsManualCover(true);
    onCoverToggle?.();
    setTimeout(() => { setIsManualCover(false); triggerToast(isCoverClosed ? 'Cover opened' : 'Cover closed'); }, 800);
  }, [isCoverClosed, onCoverToggle, triggerToast]);

  const isDanggit = currentDryingMode === 'danggit';
  const isEnvironment = currentFlipMode === 'environment';

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

  return (
    <>
      {toastPortal}
      <div className="space-y-4 pb-12">
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