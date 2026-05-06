import React from 'react';

const RainAlert = ({ rainDetected }) => {
  if (!rainDetected) {
    return (
      <div className="bg-white border-l-8 border-green-600 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="font-black text-black text-lg mb-1">ENCLOSURE STATUS · SECURED</h3>
            <p className="text-sm font-medium text-gray-700">Rain drop sensor reports dry conditions · System nominal</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-red-50 border-l-8 border-red-700 rounded-2xl p-5 mb-6 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="text-3xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-black text-red-800 text-lg mb-1">EMERGENCY · RAIN PROTOCOL ACTIVE</h3>
          <p className="text-sm font-bold text-red-700 mb-2">Immediate intervention required · Enclosure not secured</p>
          <p className="text-xs font-semibold text-red-600">Moisture detected · Retract mechanism or cover enclosure immediately</p>
        </div>
      </div>
    </div>
  );
};

export default RainAlert;