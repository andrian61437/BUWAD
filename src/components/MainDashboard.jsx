import React from 'react';
import EnvironmentalGrid from './EnvironmentalGrid';
import SystemState from './SystemState';

const MainDashboard = ({ 
  sensorData, 
  systemState, 
  fishType, 
  sunlightLabel, 
  onFishToggle, 
  onManualOverride 
}) => {
  return (
    <div>
      {/* Environmental Grid - 2x2 */}
      <EnvironmentalGrid 
        temperature={sensorData.temperature}
        humidity={sensorData.humidity}
        sunlightLabel={sunlightLabel}
        rainDetected={sensorData.rainDetected}
      />
      
      {/* System State Section */}
      <div className="mt-6">
        <SystemState 
          phase={systemState.phase}
          nextFlip={systemState.nextFlip}
        />
      </div>

      {/* Fish Toggle - Split Button */}
      <div className="mt-6">
        <div className="grid grid-cols-2 border-2 border-black">
          <button 
            onClick={() => onFishToggle('danggit')}
            className={`py-4 text-center font-black tracking-wide text-sm transition-all ${
              fishType === 'danggit' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            DANGGIT
          </button>
          <button 
            onClick={() => onFishToggle('bolinao')}
            className={`py-4 text-center font-black tracking-wide text-sm transition-all ${
              fishType === 'bolinao' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            BOLINAO
          </button>
        </div>
        <div className="border-2 border-t-0 border-black p-2 bg-gray-100">
          <div className="text-center text-xs font-bold">
            {fishType === 'danggit' ? 'RABBITFISH · THICK FILLET' : 'ANCHOVIES · SMALL MASS'}
          </div>
        </div>
      </div>

      {/* Manual Override Button */}
      <div className="mt-6">
        <button 
          onClick={onManualOverride}
          className="w-full bg-black text-white py-5 font-black text-base tracking-wide active:scale-95 transition-transform"
        >
          MANUAL OVERRIDE
        </button>
      </div>
    </div>
  );
};

export default MainDashboard;