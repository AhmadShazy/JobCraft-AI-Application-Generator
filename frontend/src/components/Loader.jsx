import React from 'react';

function Loader() {
  return (
    <div className="w-full space-y-2.5 mt-3 animate-pulse">
      <div className="flex justify-between items-center text-xs font-bold text-cyan-400">
        <span className="flex items-center space-x-1.5">
          <span className="h-1.5 w-1.5 bg-accent-450 rounded-full animate-ping"></span>
          <span>Crafting ATS Keywords & generating documents...</span>
        </span>
        <span className="text-accent-400 font-extrabold">Processing</span>
      </div>
      
      {/* Background track */}
      <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
        {/* Shimmer loading bar */}
        <div className="h-full w-full rounded-full animate-shimmer"></div>
      </div>
    </div>
  );
}

export default Loader;
