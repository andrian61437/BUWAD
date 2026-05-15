import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Alerts = ({ alerts, rainDetected, dismissedIds, onDismiss, onDismissAll, t }) => {
  const formatToStandardTime = (timestamp) => {
    if (!timestamp) return '--:-- --';
    let hours, minutes;
    if (timestamp.includes(':')) {
      const parts = timestamp.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1];
    } else return timestamp;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hours % 12 || 12}:${minutes} ${ampm}`;
  };

  const allAlerts = useMemo(() => {
    const result = [];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (rainDetected) {
      result.push({
        id: 'rain-critical',
        timestamp: currentTime,
        formattedTime: formatToStandardTime(currentTime),
        message: t('rainProtocolActivated'),
        status: t('coverSafe'),
        priority: t('high').toUpperCase()
      });
    }
    
    if (alerts && alerts.length > 0) {
      alerts.forEach((a, i) => {
        const stableId = a.id || `fb-alert-${i}`;
        result.push({
          ...a,
          id: stableId,
          formattedTime: a.formattedTime || formatToStandardTime(a.timestamp)
        });
      });
    }
    
    return result;
  }, [alerts, rainDetected, t]);

  const criticalAlerts = useMemo(() => {
    const dismissList = dismissedIds || [];
    return allAlerts.filter(a => !dismissList.includes(a.id)).slice(0, 15);
  }, [allAlerts, dismissedIds]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'HIGH': return 'text-red-500 dark:text-red-400';
      case 'MEDIUM': return 'text-yellow-500 dark:text-yellow-400';
      default: return 'text-blue-500 dark:text-blue-400';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
          {t('criticalNotifications')}
        </div>
        <div className="flex items-center gap-3">
          {criticalAlerts.length > 0 && (
            <motion.button
              onClick={() => onDismissAll?.(criticalAlerts.map(a => a.id))}
              whileTap={{ scale: 0.95 }}
              className="text-[9px] font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 tracking-[0.05em] transition-colors duration-500"
            >
              DISMISS ALL
            </motion.button>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${rainDetected ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
              {criticalAlerts.length} {t('active')}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        <AnimatePresence>
          {criticalAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl overflow-hidden border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 transition-colors duration-500"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold transition-colors duration-500 ${getPriorityColor(alert.priority || 'NORMAL')}`}>
                      {alert.priority || 'NORMAL'}
                    </span>
                    <span className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
                      {alert.formattedTime}
                    </span>
                  </div>
                  <motion.button
                    onClick={() => onDismiss?.(alert.id)}
                    whileTap={{ scale: 0.95 }}
                    className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] hover:text-red-500 transition-colors duration-500"
                  >
                    {t('dismiss')}
                  </motion.button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight transition-colors duration-500">
                      {alert.message}
                    </div>
                  </div>
                  <div className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors duration-500 ${
                    alert.status === t('coverSafe') || alert.status === t('allSystemsNominal')
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {alert.status}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {criticalAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C]/80 p-8 text-center transition-colors duration-500"
          >
            <div className="text-4xl font-black text-[#4A5568] dark:text-[#94A3B8] mb-3 transition-colors duration-500">—</div>
            <div className="text-sm font-black text-[#00386D] dark:text-[#F7FAFC] transition-colors duration-500">{t('noActiveAlerts')}</div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mt-2 transition-colors duration-500">
              {t('allSystemsOperational')}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Alerts;