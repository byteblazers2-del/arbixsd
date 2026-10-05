import React, { useState } from 'react';
import { Wrench, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';

export const RegionalNodeMaintenance: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setStatusMessage(null);
    setTimeout(() => {
      setIsRefreshing(false);
      setStatusMessage('System maintenance is currently in progress. Please check back in a short while.');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E1E7EC] flex flex-col items-center justify-center p-4 select-none">
      <div className="max-w-sm w-full bg-[#121318] border border-white/10 rounded-2xl p-6 shadow-xl text-center">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
          <Wrench className="w-7 h-7" />
        </div>

        {/* Title & Description */}
        <h1 className="text-lg font-bold text-white mb-2">
          System Maintenance
        </h1>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          The trading servers and execution clusters are temporarily undergoing scheduled database optimization and security updates.
        </p>

        {/* Minimal Info Box */}
        <div className="bg-[#181920] border border-white/5 rounded-xl p-3.5 mb-5 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" /> Estimated Time
            </span>
            <span className="font-mono text-gray-200">~ 1 Hour</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Progress
            </span>
            <span className="font-mono text-emerald-400">89% Completed</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-gray-400'}`} />
          {isRefreshing ? 'Checking Status...' : 'Check Status'}
        </button>

        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs">
            {statusMessage}
          </div>
        )}
      </div>

      <div className="mt-6 text-[11px] text-gray-600 font-mono">
        Status Code: 503 SERVICE_UNAVAILABLE
      </div>
    </div>
  );
};
