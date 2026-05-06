import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Logs = ({ activityLogs, t }) => {
  const [filter, setFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState(null);

  const getLogType = (action) => {
    const manualActions = ['FLIP NOW', 'MANUAL FLIP TRIGGERED', 'MANUAL OVERRIDE'];
    if (manualActions.includes(action)) {
      return 'manual';
    }
    
    const sensorActions = [
      'RAIN PROTOCOL ACTIVATED', 
      'SENSOR CALIBRATION', 
      'DRYING MODE CHANGED',
      'FISH PROFILE CHANGED',
      'TEMPERATURE UPDATE',
      'HUMIDITY UPDATE'
    ];
    if (sensorActions.includes(action)) {
      return 'sensor';
    }
    
    return 'system';
  };

  const processedLogs = useMemo(() => {
    const logs = [...(activityLogs || [])];
    
    const seen = new Set();
    const deduped = [];
    
    for (const log of logs) {
      const idKey = log.id || `${log.action}_${log.timestamp}_${Math.random()}`;
      if (seen.has(idKey)) continue;
      seen.add(idKey);
      
      deduped.push({
        ...log,
        id: idKey,
        category: log.category || getLogType(log.action),
        formattedTime: log.formattedTime || log.timestamp || '--:--'
      });
    }
    
    return deduped;
  }, [activityLogs]);

  const filters = [
    { id: 'all', label: t('all').toUpperCase() },
    { id: 'system', label: t('system').toUpperCase() },
    { id: 'manual', label: t('manual').toUpperCase() },
    { id: 'sensor', label: t('sensor').toUpperCase() }
  ];

  const filteredLogs = useMemo(() => {
    return processedLogs.filter(log => {
      if (filter === 'all') return true;
      return log.category === filter;
    });
  }, [processedLogs, filter]);

  const getTypeColor = (type) => {
    switch(type) {
      case 'manual': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'sensor': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'manual': return t('manual').toUpperCase();
      case 'sensor': return t('sensor').toUpperCase();
      default: return t('system').toUpperCase();
    }
  };

  const toggleExpand = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex gap-2 mb-3">
          {filters.map((f) => (
            <motion.button
              key={f.id}
              onClick={() => setFilter(f.id)}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.1em] transition-colors duration-500 ${
                filter === f.id
                  ? 'bg-[#00386D] dark:bg-[#6699CC] text-white'
                  : 'bg-white dark:bg-[#1A202C]/80 border border-[#BDBCBD] dark:border-white/10 text-[#4A5568] dark:text-[#94A3B8]'
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
        <div className="flex justify-between items-baseline">
          <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
            {t('activityFeed')}
          </div>
          <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
            {filteredLogs.length} {t('entries')}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <AnimatePresence>
          {filteredLogs.map((log, index) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
              className={`rounded-xl border overflow-hidden transition-colors duration-500 ${
                expandedLog === log.id ? 'border-[#6699CC] shadow-md' : 'border-[#BDBCBD] dark:border-white/10'
              } bg-white dark:bg-[#1A202C]/80`}
            >
              <motion.div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(log.id)}
                whileHover={{ backgroundColor: 'rgba(102, 153, 204, 0.05)' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-500 ${getTypeColor(log.category)}`}>
                      {getTypeLabel(log.category)}
                    </span>
                    <span className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] font-mono transition-colors duration-500">
                      {log.formattedTime}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedLog === log.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg className="w-4 h-4 text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
                <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight mt-2 transition-colors duration-500">
                  {log.action}
                </div>
              </motion.div>

              <AnimatePresence initial={false}>
                {expandedLog === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-[#BDBCBD] dark:border-white/10 transition-colors duration-500">
                      <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
                        {log.details || t('noAdditionalDetails')}
                      </div>
                      {log.sensorValues && (
                        <motion.div
                          className="mt-3 grid grid-cols-2 gap-2"
                          initial="hidden"
                          animate="visible"
                          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
                        >
                          {Object.entries(log.sensorValues).map(([k, v]) => (
                            <motion.div
                              key={k}
                              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                              className="bg-gray-50 dark:bg-[#1A202C]/50 rounded-lg px-3 py-2 transition-colors duration-500"
                            >
                              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wide transition-colors duration-500">
                                {k.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">{v}</div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <div className="rounded-xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 p-8 text-center transition-colors duration-500">
            <div className="text-4xl font-black text-[#4A5568] dark:text-[#94A3B8] mb-3 transition-colors duration-500">—</div>
            <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">{t('noActivityRecorded')}</div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mt-2 transition-colors duration-500">
              {t('systemEventsWillAppear')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;