import React from 'react';

const WeatherFeed = ({ timeToDry, forecast, lightIntensity, rainDetected }) => {
  const getOptimalWindow = () => {
    if (rainDetected) return 'Rain detected · Immediate intervention needed';
    if (lightIntensity > 70) return 'Optimal drying window · Peak solar activity';
    if (lightIntensity > 40) return 'Moderate conditions · Drying progressing';
    return 'Low solar irradiance · Extended drying expected';
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-black tracking-tight mb-5 pb-2 border-b border-gray-200">
        PREDICTIVE INSIGHTS
      </h2>
      
      <div className="mb-5">
        <div className="text-sm font-bold text-gray-600 mb-1">TIME TO DRY · ESTIMATE</div>
        <div className="text-5xl font-black text-black">
          {timeToDry}<span className="text-2xl ml-1">hours</span>
        </div>
        <div className="text-xs font-semibold text-gray-500 mt-1">
          Based on realtime solar irradiance
        </div>
      </div>
      
      <div className="h-px bg-gray-200 my-4"></div>
      
      <div>
        <div className="text-sm font-bold text-gray-600 mb-2">24 HOUR FORECAST · CEBU CITY</div>
        <div className="text-base font-bold text-black mb-2">{forecast}</div>
        <div className="p-3 bg-gray-50 rounded-xl mt-3">
          <span className="font-black text-sm">OPTIMAL WINDOW: </span>
          <span className="text-sm font-semibold">{getOptimalWindow()}</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherFeed;