import React from 'react';

const PowerMetrics = ({ batteryLevel, thermalEfficiency }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-black tracking-tight mb-5 pb-2 border-b border-gray-200">
        POWER & THERMAL MANAGEMENT
      </h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-bold text-gray-700">ESP32 SOLAR BATTERY</span>
          <span className="text-2xl font-black">{batteryLevel}<span className="text-sm ml-1">%</span></span>
        </div>
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
          <div 
            className="bg-black h-full rounded-full transition-all duration-300"
            style={{ width: `${batteryLevel}%` }}
          ></div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-bold text-gray-700">THERMAL EFFICIENCY</span>
          <span className="text-2xl font-black">{thermalEfficiency}<span className="text-sm ml-1">%</span></span>
        </div>
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
          <div 
            className="bg-black h-full rounded-full transition-all duration-300"
            style={{ width: `${thermalEfficiency}%` }}
          ></div>
        </div>
        <div className="text-xs font-semibold text-gray-500 mt-3">
          Internal heat vs Cebu City ambient baseline · Optimal range 70% to 95%
        </div>
      </div>
    </div>
  );
};

export default PowerMetrics;