import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BatchWizardModal = ({
  isOpen,
  onClose,
  onStartBatch,
  initialDryingMode = 'danggit',
  initialFlipMode = 'timer',
  initialTimerInterval = 15,
  t
}) => {
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Put the Fish, Step 2: Controls
  const [selectedSpecies, setSelectedSpecies] = useState(initialDryingMode);
  const [batchWeight, setBatchWeight] = useState('5.0');
  const [selectedFlipMode, setSelectedFlipMode] = useState(initialFlipMode);
  const [selectedInterval, setSelectedInterval] = useState(initialTimerInterval || 15);
  const [checklist, setChecklist] = useState({
    fleshUp: true,
    trayLatched: true,
    canopyClear: true
  });

  if (!isOpen) return null;

  const isDanggit = selectedSpecies === 'danggit';

  const handleDonePuttingFish = () => {
    setCurrentStep(2);
  };

  const handleLaunch = () => {
    onStartBatch({
      dryingMode: selectedSpecies,
      flipMode: selectedFlipMode,
      timerInterval: selectedInterval,
      batchWeight: parseFloat(batchWeight) || 5.0
    });
    onClose();
  };

  const toggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = checklist.fleshUp && checklist.trayLatched && checklist.canopyClear;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-white dark:bg-[#1A202C] rounded-3xl border border-[#BDBCBD] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-[#6699CC] uppercase tracking-widest block">
                BATCH INITIALIZATION WIZARD
              </span>
              <h3 className="text-base font-black text-[#00386D] dark:text-[#F7FAFC]" style={{ fontFamily: 'Space Grotesk' }}>
                {currentStep === 1 ? 'Phase 1: Put the Fish in the Dryer' : 'Phase 2: Set Drying Controls'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[#4A5568] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="px-5 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full transition-colors ${currentStep >= 1 ? 'bg-[#00386D] dark:bg-[#6699CC]' : 'bg-gray-200 dark:bg-white/10'}`} />
              <div className={`flex-1 h-1.5 rounded-full transition-colors ${currentStep >= 2 ? 'bg-[#00386D] dark:bg-[#6699CC]' : 'bg-gray-200 dark:bg-white/10'}`} />
            </div>
            <div className="flex justify-between text-[8px] font-black text-[#4A5568] dark:text-[#94A3B8] uppercase mt-1">
              <span className={currentStep === 1 ? 'text-[#00386D] dark:text-[#6699CC]' : ''}>1. Load Fish</span>
              <span className={currentStep === 2 ? 'text-[#00386D] dark:text-[#6699CC]' : ''}>2. Control Phase</span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {currentStep === 1 ? (
              // ===== STEP 1: PUT THE FISH =====
              <div className="space-y-4">
                {/* Species Card Selector */}
                <div>
                  <label className="text-[9px] font-black text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider block mb-2">
                    SELECT FISH SPECIES
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecies('danggit');
                        setSelectedInterval(15);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isDanggit
                          ? 'border-[#00386D] dark:border-[#6699CC] bg-[#00386D]/5 dark:bg-[#6699CC]/10 shadow-sm'
                          : 'border-gray-200 dark:border-white/10 hover:border-[#6699CC]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">🐟</span>
                        {isDanggit && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="font-black text-[#00386D] dark:text-[#F7FAFC] text-sm mt-1">Danggit</div>
                      <div className="text-[9px] text-[#4A5568] dark:text-[#94A3B8] mt-0.5">Rabbitfish • 12h Cycle</div>
                      <div className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">Target: 18% MC</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecies('bolinao');
                        setSelectedInterval(10);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        !isDanggit
                          ? 'border-[#00386D] dark:border-[#6699CC] bg-[#00386D]/5 dark:bg-[#6699CC]/10 shadow-sm'
                          : 'border-gray-200 dark:border-white/10 hover:border-[#6699CC]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">🦐</span>
                        {!isDanggit && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="font-black text-[#00386D] dark:text-[#F7FAFC] text-sm mt-1">Bolinao</div>
                      <div className="text-[9px] text-[#4A5568] dark:text-[#94A3B8] mt-0.5">Anchovy • 7h Cycle</div>
                      <div className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">Target: 17% MC</div>
                    </button>
                  </div>
                </div>

                {/* Batch Weight */}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <label className="text-[9px] font-black text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider block">
                    BATCH LOAD WEIGHT
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={batchWeight}
                      onChange={(e) => setBatchWeight(e.target.value)}
                      placeholder="5.0"
                      className="w-full bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm font-black text-[#00386D] dark:text-[#F7FAFC] outline-none focus:border-[#6699CC]"
                    />
                    <span className="text-xs font-black text-[#6699CC]">kg</span>
                  </div>
                </div>

                {/* Physical Loading Guide & Checklist */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    <span>📋</span> TRAY PREPARATION CHECKLIST
                  </div>
                  <div className="space-y-1.5 text-[10px] font-medium text-[#4A5568] dark:text-[#CBD5E1]">
                    <label 
                      onClick={() => toggleCheck('fleshUp')}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input 
                        type="checkbox" 
                        checked={checklist.fleshUp} 
                        readOnly 
                        className="rounded text-[#00386D] focus:ring-0" 
                      />
                      <span>Fish slices laid <strong>flesh-side up</strong> on mesh rack</span>
                    </label>
                    <label 
                      onClick={() => toggleCheck('trayLatched')}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input 
                        type="checkbox" 
                        checked={checklist.trayLatched} 
                        readOnly 
                        className="rounded text-[#00386D] focus:ring-0" 
                      />
                      <span>Dual-sided mesh tray locking pins <strong>latched firmly</strong></span>
                    </label>
                    <label 
                      onClick={() => toggleCheck('canopyClear')}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input 
                        type="checkbox" 
                        checked={checklist.canopyClear} 
                        readOnly 
                        className="rounded text-[#00386D] focus:ring-0" 
                      />
                      <span>Canopy swing path clear of any physical obstructions</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              // ===== STEP 2: CONTROL PHASE =====
              <div className="space-y-4">
                {/* Flipping Strategy Mode */}
                <div>
                  <label className="text-[9px] font-black text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider block mb-2">
                    SELECT FLIPPING CONTROL STRATEGY
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedFlipMode('timer')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedFlipMode === 'timer'
                          ? 'border-[#00386D] dark:border-[#6699CC] bg-[#00386D]/5 dark:bg-[#6699CC]/10 shadow-sm'
                          : 'border-gray-200 dark:border-white/10 hover:border-[#6699CC]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">⏱️</span>
                        {selectedFlipMode === 'timer' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="font-black text-[#00386D] dark:text-[#F7FAFC] text-sm mt-1">Timer-Based</div>
                      <div className="text-[8.5px] text-[#4A5568] dark:text-[#94A3B8] mt-0.5">Fixed Interval Rhythm</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedFlipMode('environment')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedFlipMode === 'environment'
                          ? 'border-[#00386D] dark:border-[#6699CC] bg-[#00386D]/5 dark:bg-[#6699CC]/10 shadow-sm'
                          : 'border-gray-200 dark:border-white/10 hover:border-[#6699CC]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">☀️</span>
                        {selectedFlipMode === 'environment' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="font-black text-[#00386D] dark:text-[#F7FAFC] text-sm mt-1">Solar-Adaptive</div>
                      <div className="text-[8.5px] text-[#4A5568] dark:text-[#94A3B8] mt-0.5">Sun &amp; Temp Auto-Tuned</div>
                    </button>
                  </div>
                </div>

                {/* Interval Selection (if timer-based) */}
                {selectedFlipMode === 'timer' && (
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                        FLIP INTERVAL (MINUTES)
                      </label>
                      <span className="text-xs font-black text-[#00386D] dark:text-[#6699CC]">
                        Every {selectedInterval} mins
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[10, 15, 20, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSelectedInterval(mins)}
                          className={`py-2 rounded-xl text-xs font-black transition-colors ${
                            selectedInterval === mins
                              ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                              : 'bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 text-[#4A5568] dark:text-[#94A3B8]'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rain Canopy Armed Notice */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <div>
                      <div className="text-[9.5px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                        RAIN PROTECTION ARMED
                      </div>
                      <div className="text-[8px] text-emerald-600/80 dark:text-emerald-400">
                        Canopy will auto-close under 3 seconds upon raindrop detection
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                    ACTIVE
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center gap-2.5">
            {currentStep === 1 ? (
              <motion.button
                type="button"
                onClick={handleDonePuttingFish}
                disabled={!allChecked}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.005 }}
                className={`w-full py-4 rounded-2xl font-black text-xs tracking-wider uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${
                  allChecked
                    ? 'bg-[#00386D] dark:bg-[#6699CC] text-white'
                    : 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>✓ DONE PUTTING THE FISH (NEXT: CONTROLS)</span>
                <span>→</span>
              </motion.button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-4 rounded-2xl bg-gray-100 dark:bg-white/10 text-[#4A5568] dark:text-[#94A3B8] font-black text-xs uppercase tracking-wider hover:text-[#00386D] dark:hover:text-white transition-colors"
                >
                  ← BACK
                </button>
                <motion.button
                  type="button"
                  onClick={handleLaunch}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.005 }}
                  className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
                >
                  <span>🚀 START DRYING BATCH</span>
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchWizardModal;
