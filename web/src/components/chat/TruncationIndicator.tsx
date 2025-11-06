import { useStore } from '../../state/store';

export default function TruncationIndicator() {
  const { contextUsage } = useStore();

  if (!contextUsage?.truncated) return null;

  const { removedMessages, tokens, maxTokens } = contextUsage;

  return (
    <div className="flex items-center justify-center py-6 px-4">
      <div className="glass-strong rounded-2xl p-4 max-w-2xl w-full border border-amber-500/30 shadow-float">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-white">Context Window Optimized</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-300">
                {((tokens / maxTokens) * 100).toFixed(1)}% used
              </span>
            </div>
            
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              Evelyn's active memory reached its limit. To continue our conversation smoothly, 
              <span className="text-amber-300 font-semibold"> {removedMessages} older message{removedMessages !== 1 ? 's' : ''}</span> 
              {' '}ha{removedMessages !== 1 ? 've' : 's'} been saved to her long-term memory and removed from active context.
            </p>

            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Memories preserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>Recent context maintained</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Personality intact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

