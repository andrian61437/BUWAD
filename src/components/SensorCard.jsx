import React from 'react';

const SensorCard = ({ label, value, unit, min, max, range }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="text-4xl md:text-5xl font-black text-black mb-2">
        {value.toFixed(1)}<span className="text-xl ml-1">{unit}</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full mt-3">
        <div 
          className="bg-black h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        ></div>
      </div>
      <div className="text-xs font-semibold text-gray-500 mt-2">
        {range}
      </div>
    </div>
  );
};

export default SensorCard;