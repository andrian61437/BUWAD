import React from 'react';
import { motion } from 'framer-motion';

const WelcomeScreen = ({ onGetStarted, toggleDarkMode, isDarkMode }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        
        <header className="sticky top-0 z-20 px-4 pt-4 pb-3 flex justify-end">
          <motion.button
            onClick={toggleDarkMode}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-lg hover:bg-[#00386D]/10 dark:hover:bg-[#6699CC]/20 transition-colors duration-500"
          >
            {isDarkMode ? (
              <svg className="w-4 h-4 text-[#6699CC] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[#00386D] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </motion.button>
        </header>

        <div className="flex-1 flex flex-col justify-center px-6 -mt-16">
          <div className="text-center">
            
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-6xl font-black tracking-tight text-[#00386D] dark:text-[#F7FAFC] mb-3 transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
                BUWAD
              </h1>
              <div className="w-16 h-px bg-[#6699CC] mx-auto mb-4"></div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-sm font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-10 transition-colors duration-500"
            >
              Solar Powered Fish Dryer
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-12"
            >
              <p className="text-base italic text-[#00386D] dark:text-[#F7FAFC] leading-relaxed transition-colors duration-500">
                "Preserving catch,<br />
                empowering coastal communities"
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              onClick={onGetStarted}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3 rounded-xl bg-[#00386D] dark:bg-[#6699CC] text-white font-black text-base tracking-wide hover:opacity-90 transition-colors duration-500"
            >
              GET STARTED
            </motion.button>

          </div>
        </div>

        <div className="text-center pb-6">
          <p className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
            SMART FISH DRYING · SUSTAINABLE TECHNOLOGY
          </p>
        </div>

      </div>
    </div>
  );
};

export default WelcomeScreen;