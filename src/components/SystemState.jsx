import React from 'react';

const SystemState = ({ phase, nextFlip }) => {
  return (
    <div>
      <div className="border-2 border-black p-5">
        <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-1">SYSTEM STATE</div>
        <div className="text-2xl font-black tracking-tight">
          PHASE 2: ACTIVE FLIPPING
        </div>
      </div>
      
      <div className="grid grid-cols-2 border-2 border-t-0 border-black">
        <div className="p-5 border-r-2 border-black">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">SCHEDULER</div>
          <div className="text-sm font-bold">STATUS</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-2">NEXT FLIP</div>
          <div className="text-4xl font-black tracking-tight">{nextFlip}</div>
        </div>
      </div>
    </div>
  );
};

export default SystemState;