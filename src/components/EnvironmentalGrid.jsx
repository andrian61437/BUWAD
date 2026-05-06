import React from 'react';

const EnvironmentalGrid = ({ temperature, humidity, sunlightLabel, rainDetected }) => {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">ENVIRONMENTAL DATA</div>
      
      <div className="grid grid-cols-2 border-2 border-black">
        <div className="p-5 border-r-2 border-black">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">TEMPERATURE</div>
          <div className="text-5xl font-black tracking-tight">{temperature.toFixed(1)}°C</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">HUMIDITY</div>
          <div className="text-5xl font-black tracking-tight">{Math.floor(humidity)}%</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 border-2 border-t-0 border-black">
        <div className="p-5 border-r-2 border-black">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">SUNLIGHT</div>
          <div className="text-4xl font-black tracking-tight">{sunlightLabel}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">RAIN SENSOR</div>
          <div className="text-4xl font-black tracking-tight">{rainDetected ? 'WET' : 'DRY'}</div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalGrid;