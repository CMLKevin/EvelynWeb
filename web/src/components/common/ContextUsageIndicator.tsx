import { useStore } from '../../state/store';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

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

  const tokens = contextUsage?.tokens ?? 0;
  const maxTokens = contextUsage?.maxTokens ?? 128000;
  const percentage = contextUsage?.percentage ?? 0;
  const messageCount = contextUsage?.messageCount ?? 0;
  const truncated = contextUsage?.truncated ?? false;
  const removedMessages = contextUsage?.removedMessages;

  const getColorClass = () => {
    if (percentage > 90) return 'text-red-400';
    if (percentage > 75) return 'text-yellow-400';
    if (percentage > 50) return 'text-cyan-400';
    return 'text-green-400';
  };

  const getBarColor = () => {
    if (percentage > 90) return 'bg-red-400';
    if (percentage > 75) return 'bg-yellow-400';
    if (percentage > 50) return 'bg-cyan-400';
    return 'bg-green-400';
  };

  return (
    <>
      {/* Truncation Alert */}
      {showTruncationAlert && truncated && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="terminal-panel px-6 py-4 shadow-[0_0_20px_rgba(0,255,255,0.3)] max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-yellow-400 mb-1 monospace">CONTEXT OPTIMIZED</p>
                <p className="text-xs text-gray-300 monospace leading-relaxed">
                  Conversation condensed. 
                  {removedMessages && <span className="text-yellow-400"> {removedMessages} messages</span>} 
                  {' '}saved to long-term memory.
                </p>
              </div>
              <button 
                onClick={() => setShowTruncationAlert(false)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimalistic Context Indicator */}
      <div className="flex items-center gap-2 bg-black/60 border border-cyan-500/30 rounded px-3 py-1.5 group hover:border-cyan-500/50 transition-all relative">
        {/* Visual Token Bar */}
        <div className="relative w-16 h-1.5 bg-gray-800 rounded overflow-hidden">
          <div
            className={`h-full ${getBarColor()} rounded transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Stats (minimal) */}
        <div className="flex items-center gap-2 monospace">
          <span className={`text-[10px] font-bold ${getColorClass()} transition-colors`}>
            {(tokens / 1000).toFixed(1)}K
          </span>
          <span className="text-[9px] text-gray-600">/</span>
          <span className="text-[10px] text-gray-500">128K</span>
        </div>

        {/* Truncation indicator */}
        {truncated && (
          <AlertTriangle className="w-3 h-3 text-yellow-400" title={`${removedMessages} messages condensed`} />
        )}

        {/* Tooltip on hover */}
        <div className="hidden group-hover:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 terminal-panel rounded px-4 py-3 shadow-[0_0_20px_rgba(0,255,255,0.3)] z-50 min-w-[220px] animate-fade-in">
          <div className="space-y-2 monospace text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">CTX WINDOW</span>
              <span className={`font-bold ${getColorClass()}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">TOKENS</span>
              <span className="text-white">{tokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">MESSAGES</span>
              <span className="text-white">{messageCount}</span>
            </div>
            {messageCount === 0 && (
              <div className="border-t border-cyan-500/30 pt-2">
                <p className="text-[9px] text-gray-600 text-center">
                  Will update as you chat
                </p>
              </div>
            )}
            {truncated && (
              <>
                <div className="border-t border-cyan-500/30 pt-2" />
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-bold">OPTIMIZED</p>
                    <p className="text-[9px] text-gray-400 leading-tight">
                      {removedMessages} saved to memory
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
