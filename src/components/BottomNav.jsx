import React from 'react';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'controls', label: 'CONTROLS' },
    { id: 'alerts', label: 'ALERTS' },
    { id: 'logs', label: 'LOGS' }
  ];
  
  return (
    <div className="border-t-2 border-black bg-offwhite mt-8">
      <div className="grid grid-cols-4 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`text-center text-xs font-bold py-2 transition-all ${
              activeTab === tab.id 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;