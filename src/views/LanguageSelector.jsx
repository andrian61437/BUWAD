import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ toggleDarkMode, isDarkMode, onLanguageSelected }) => {
  const { selectLanguage, registerLanguageCallback } = useLanguage();
  const [selectedLang, setSelectedLang] = useState('en');
  const [saveLanguage, setSaveLanguage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const isCallbackRegistered = useRef(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: 'US', region: 'United States' },
    { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', flag: 'PH', region: 'Philippines' },
    { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', flag: 'PH', region: 'Philippines' },
    { code: 'es', name: 'Español', nativeName: 'Español', flag: 'ES', region: 'Spain' },
    { code: 'fr', name: 'Français', nativeName: 'Français', flag: 'FR', region: 'France' },
    { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: 'DE', region: 'Germany' },
    { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: 'IT', region: 'Italy' },
    { code: 'pt', name: 'Português', nativeName: 'Português', flag: 'PT', region: 'Portugal' }
  ];

  const handleLanguageSelected = useCallback(() => {
    if (onLanguageSelected) {
      onLanguageSelected();
    }
  }, [onLanguageSelected]);

  useEffect(() => {
    if (!isCallbackRegistered.current && registerLanguageCallback) {
      registerLanguageCallback(handleLanguageSelected);
      isCallbackRegistered.current = true;
    }
  }, [registerLanguageCallback, handleLanguageSelected]);

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = (langCode) => {
    setSelectedLang(langCode);
  };

  const handleContinue = () => {
    selectLanguage(selectedLang, saveLanguage);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        
        <header className="sticky top-0 z-20 px-4 pt-4 pb-3 border-b bg-transparent border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black tracking-tight text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500" style={{ fontFamily: 'Space Grotesk' }}>
              BUWAD
            </h1>
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
        </div>
      </header>

        <div className="flex-1 px-4 py-4">
          
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight mb-1 transition-colors duration-500">
              Select Language
            </h2>
            <p className="text-[11px] font-medium text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
              Choose your preferred language
            </p>
          </div>

          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-9 pr-3 text-sm rounded-xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 text-[#00386D] dark:text-[#F7FAFC] placeholder:text-[#4A5568] dark:placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6699CC] transition-colors duration-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 mb-4 max-h-[50vh] overflow-y-auto">
            <AnimatePresence>
              {filteredLanguages.map((lang, index) => (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  onClick={() => handleLanguageSelect(lang.code)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-2.5 px-3 rounded-lg border transition-colors duration-500 flex items-center justify-between ${
                    selectedLang === lang.code
                      ? 'border-[#6699CC] bg-[#6699CC]/5 dark:bg-[#6699CC]/10'
                      : 'border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 hover:border-[#6699CC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-colors duration-500 ${
                      selectedLang === lang.code
                        ? 'bg-[#6699CC] text-white'
                        : 'bg-[#00386D]/5 dark:bg-[#6699CC]/10 text-[#00386D] dark:text-[#6699CC]'
                    }`}>
                      {lang.flag}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-black transition-colors duration-500 ${
                        selectedLang === lang.code
                          ? 'text-[#6699CC]'
                          : 'text-[#00386D] dark:text-[#F7FAFC]'
                      }`}>
                        {lang.name}
                      </div>
                      <div className="text-[9px] font-medium text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
                        {lang.nativeName}
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border transition-colors duration-500 flex items-center justify-center ${
                    selectedLang === lang.code
                      ? 'border-[#6699CC] bg-[#6699CC]'
                      : 'border-[#BDBCBD] dark:border-white/30'
                  }`}>
                    {selectedLang === lang.code && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            
            {filteredLanguages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">No languages found</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 cursor-pointer transition-colors duration-500 hover:border-[#6699CC]">
              <div>
                <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">
                  Remember my language
                </div>
                <div className="text-[7px] font-bold text-[#4A5568] dark:text-[#94A3B8] mt-0.5 transition-colors duration-500">
                  Skip language selection next time
                </div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSaveLanguage(!saveLanguage);
                }}
                className={`relative w-8 h-4 rounded-full transition-colors duration-500 cursor-pointer ${
                  saveLanguage ? 'bg-[#6699CC]' : 'bg-[#BDBCBD] dark:bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-500 ${
                    saveLanguage ? 'left-[17px]' : 'left-0.5'
                  }`}
                />
              </div>
            </label>
          </div>

          <motion.button
            onClick={handleContinue}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 rounded-lg bg-[#00386D] dark:bg-[#6699CC] text-white font-black text-sm tracking-wide transition-colors duration-500 hover:opacity-90"
          >
            Continue
          </motion.button>

        </div>

      </div>
    </div>
  );
};

export default LanguageSelector;