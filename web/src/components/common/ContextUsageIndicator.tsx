import { useStore } from '../../state/store';
import { useState, useEffect } from 'react';

export default function ContextUsageIndicator() {
  const { contextUsage } = useStore();
  const [showTruncationAlert, setShowTruncationAlert] = useState(false);

  useEffect(() => {
    if (contextUsage?.truncated) {
      setShowTruncationAlert(true);
      const timer = setTimeout(() => setShowTruncationAlert(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [contextUsage?.truncated]);

  // Always show, with defaults if no data yet
  const tokens = contextUsage?.tokens ?? 0;
  const maxTokens = contextUsage?.maxTokens ?? 128000;
  const percentage = contextUsage?.percentage ?? 0;
  const messageCount = contextUsage?.messageCount ?? 0;
  const truncated = contextUsage?.truncated ?? false;
  const removedMessages = contextUsage?.removedMessages;

  const getColorClass = () => {
    if (percentage > 90) return 'text-red-400';
    if (percentage > 75) return 'text-amber-400';
    if (percentage > 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBarColor = () => {
    if (percentage > 90) return 'from-red-500 to-pink-500';
    if (percentage > 75) return 'from-amber-500 to-orange-500';
    if (percentage > 50) return 'from-yellow-500 to-amber-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <>
      {/* Truncation Alert */}
      {showTruncationAlert && truncated && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="glass-strong px-6 py-4 rounded-2xl shadow-float border border-amber-500/30 max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Context Window Optimized</p>
                <p className="text-xs text-gray-300">
                  Evelyn condensed the conversation to fit her memory. 
                  {removedMessages && <span className="text-amber-400 font-semibold"> {removedMessages} older messages</span>} 
                  were saved to long-term memory and removed from active context.
                </p>
              </div>
              <button 
                onClick={() => setShowTruncationAlert(false)}
                className="flex-shrink-0 w-5 h-5 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimalistic Context Indicator */}
      <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5 group hover:glass-strong transition-all">
        {/* Visual Token Bar */}
        <div className="relative w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getBarColor()} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Stats (minimal) */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold ${getColorClass()} transition-colors`}>
            {(tokens / 1000).toFixed(1)}K
          </span>
          <span className="text-[9px] text-gray-500">/</span>
          <span className="text-[10px] text-gray-500">128K</span>
        </div>

        {/* Truncation indicator */}
        {truncated && (
          <div className="flex items-center gap-1" title={`${removedMessages} messages condensed`}>
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Tooltip on hover */}
        <div className="hidden group-hover:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 glass-strong rounded-xl px-4 py-3 shadow-float border border-white/10 z-50 min-w-[200px] animate-fade-in">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400">Context Window</span>
              <span className={`text-xs font-bold ${getColorClass()}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400">Tokens Used</span>
              <span className="text-xs text-white">{tokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400">Messages</span>
              <span className="text-xs text-white">{messageCount}</span>
            </div>
            {messageCount === 0 && (
              <div className="border-t border-white/10 pt-2">
                <p className="text-[9px] text-gray-500 italic text-center">
                  Context will update as you chat
                </p>
              </div>
            )}
            {truncated && (
              <>
                <div className="border-t border-white/10 pt-2" />
                <div className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-amber-400 font-semibold">Optimized</p>
                    <p className="text-[9px] text-gray-400 leading-tight">
                      {removedMessages} messages saved to memory
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

