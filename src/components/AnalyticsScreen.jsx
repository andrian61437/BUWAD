import React from 'react';

const AnalyticsScreen = ({ powerData }) => {
  // Sample log data - in production, this would come from Firebase
  const logs = [
    { time: '14:00', condition: 'SUNNY', temp: '33°C' },
    { time: '15:00', condition: 'SUNNY', temp: '32.8°C' },
    { time: '16:00', condition: 'PARTLY CLOUDY', temp: '31°C' },
    { time: '17:00', condition: 'RAIN PROBABLE', temp: '28°C' },
    { time: '18:00', condition: 'OVERCAST', temp: '27°C' }
  ];

  return (
    <div>
      {/* Battery Storage */}
      <div className="border-2 border-black p-5 mb-4">
        <div className="flex justify-between items-baseline">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide">BATTERY STORAGE</div>
          <div className="text-xs font-bold text-gray-500">{powerData.batteryLevel}% SOLAR CAPACITY</div>
        </div>
        <div className="text-4xl font-black tracking-tight mt-2">{powerData.batteryLevel}%</div>
        <div className="w-full bg-gray-200 h-1 mt-3">
          <div className="bg-black h-full" style={{ width: `${powerData.batteryLevel}%` }}></div>
        </div>
      </div>

      {/* Thermal Efficiency */}
      <div className="border-2 border-black p-5 mb-4">
        <div className="flex justify-between items-baseline">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide">THERMAL EFFICIENCY</div>
          <div className="text-xs font-bold text-gray-500">VS AMBIENT</div>
        </div>
        <div className="text-4xl font-black tracking-tight mt-2">+{powerData.thermalEfficiency}°C</div>
      </div>

      {/* Remaining Process Time */}
      <div className="border-2 border-black p-5 mb-6">
        <div className="text-[10px] font-bold text-gray-500 tracking-wide">REMAINING PROCESS TIME</div>
        <div className="text-5xl font-black tracking-tight mt-2">{powerData.remainingTime}</div>
      </div>

      {/* 24H Environmental Logs */}
      <div className="border-2 border-black">
        <div className="border-b-2 border-black p-3">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide">24H ENVIRONMENTAL LOGS</div>
        </div>
        <div className="divide-y divide-black">
          {logs.map((log, index) => (
            <div key={index} className="p-3 flex justify-between items-center">
              <span className="text-sm font-bold">{log.time}</span>
              <span className="text-sm font-bold">{log.condition}</span>
              <span className="text-sm font-mono font-bold">{log.temp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsScreen;