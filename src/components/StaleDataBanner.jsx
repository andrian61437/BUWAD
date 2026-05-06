import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const StaleDataBanner = ({ hasRealData, t }) => {
  if (hasRealData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl border border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/20 px-4 py-2 mb-4"
      >
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
      </motion.div>
    </AnimatePresence>
  );
};

export default StaleDataBanner;