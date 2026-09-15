
function Loader() {
  return (
    <div className="w-full space-y-2.5 mt-3 animate-pulse">
      <div className="flex justify-between items-center text-xs font-bold text-cyan-700 dark:text-cyan-300">
        <span className="flex items-center space-x-1.5">
          <span className="h-1.5 w-1.5 bg-accent-500 dark:bg-accent-400 rounded-full animate-ping"></span>
          <span>Crafting ATS Keywords & generating documents...</span>
        </span>
        <span className="text-accent-600 dark:text-accent-400 font-extrabold">Processing</span>
      </div>
      
      {/* Background track */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-full overflow-hidden">
        {/* Shimmer loading bar */}
        <div className="h-full w-full rounded-full animate-shimmer"></div>
      </div>
    </div>
  );
}

export default Loader;
