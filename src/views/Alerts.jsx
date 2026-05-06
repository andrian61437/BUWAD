import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Alerts = ({ alerts, rainDetected, t }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const formatToStandardTime = (timestamp) => {
    if (!timestamp) return '--:-- --';
    
    let hours, minutes;
    
    if (timestamp.includes(':')) {
      const parts = timestamp.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1];
    } else {
      return timestamp;
    }
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const standardHours = hours % 12 || 12;
    
    return `${standardHours}:${minutes} ${ampm}`;
  };

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const criticalAlerts = [
    ...(rainDetected ? [{
      id: 'rain-critical',
      timestamp: currentTime,
      formattedTime: formatToStandardTime(currentTime),
      message: t('rainProtocolActivated'),
      status: t('coverSafe'),
      type: 'critical',
      priority: t('high').toUpperCase()
    }] : []),
    ...(alerts.length > 0 ? alerts : [
      {
        id: 'demo-1',
        timestamp: '09:30',
        formattedTime: formatToStandardTime('09:30'),
        message: t('systemReady'),
        status: t('allSystemsNominal'),
        priority: t('normal').toUpperCase()
      },
      {
        id: 'demo-2',
        timestamp: '10:15',
        formattedTime: formatToStandardTime('10:15'),
        message: t('dryingCycleStarted'),
        status: t('phase2Active'),
        priority: t('info').toUpperCase()
      }
    ])
  ].filter(a => !dismissedAlerts.includes(a.id)).slice(0, 15);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'HIGH': return 'text-red-500 dark:text-red-400';
      case 'MEDIUM': return 'text-yellow-500 dark:text-yellow-400';
      default: return 'text-blue-500 dark:text-blue-400';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] transition-colors duration-500">
            {t('criticalNotifications')}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${rainDetected ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
              {criticalAlerts.length} {t('active')}
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <AnimatePresence>
            {criticalAlerts.map((alert, index) => (
              <motion.div
                key={alert.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
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
                    {alert.id !== 'demo-1' && alert.id !== 'demo-2' && (
                      <motion.button
                        onClick={() => handleDismiss(alert.id)}
                        whileTap={{ scale: 0.95 }}
                        className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] hover:text-red-500 transition-colors duration-500"
                      >
                        {t('dismiss')}
                      </motion.button>
                    )}
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

      {dismissedAlerts.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] mb-3 transition-colors duration-500">
            {t('dismissedAlerts')}
          </div>
          <div className="space-y-2">
            {dismissedAlerts.slice(-5).map((alertId) => {
              const alert = alerts.find(a => a.id === alertId);
              if (!alert) return null;
              return (
                <div key={alertId} className="rounded-xl border border-[#BDBCBD] dark:border-white/10 bg-white/50 dark:bg-[#1A202C]/40 p-3 opacity-60 transition-colors duration-500">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] transition-colors duration-500">
                      {alert.formattedTime}
                    </span>
                    <span className="text-[10px] font-black text-green-600 dark:text-green-400 transition-colors duration-500">{t('resolved')}</span>
                  </div>
                  <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC] mt-1 transition-colors duration-500">{alert.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;