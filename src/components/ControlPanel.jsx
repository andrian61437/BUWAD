import React from 'react';

const ControlPanel = ({ 
  phase, 
  countdown, 
  onManualOverride, 
  onTogglePause, 
  isPaused,
  fishType,
  onFishToggle
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-baseline mb-5 pb-2 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black tracking-tight">SYSTEM CONTROLS</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${phase === 'activeflipping' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
          {phase === 'activeflipping' ? 'ACTIVE FLIPPING' : 'MONITORING'}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="text-sm font-bold text-gray-600 mb-2">FLIP CYCLE COUNTDOWN</div>
        <div className="text-5xl font-black tracking-wider font-mono">
          {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
        </div>
      </div>
      
      <div className="flex gap-3 mb-6">
        <button 
          onClick={onManualOverride}
          className="flex-1 bg-black text-white py-4 rounded-full font-bold text-base active:scale-95 transition-transform"
        >
          MANUAL OVERRIDE
        </button>
        <button 
          onClick={onTogglePause}
          className="flex-1 border-2 border-black bg-white text-black py-4 rounded-full font-bold text-base active:scale-95 transition-transform"
        >
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>
      
      <div className="h-px bg-gray-200 my-4"></div>
      
      <div>
        <div className="text-sm font-bold text-gray-600 mb-3">DRYING PARAMETERS</div>
        <div className="flex gap-2">
          <button 
            onClick={() => onFishToggle('danggit')}
            className={`flex-1 py-3 rounded-full font-bold transition-all ${fishType === 'danggit' ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
          >
            Danggit
          </button>
          <button 
            onClick={() => onFishToggle('bolinao')}
            className={`flex-1 py-3 rounded-full font-bold transition-all ${fishType === 'bolinao' ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
          >
            Bolinao
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;