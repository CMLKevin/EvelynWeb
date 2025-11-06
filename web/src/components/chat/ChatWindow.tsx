import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ContextUsageIndicator from '../common/ContextUsageIndicator';
import { useStore } from '../../state/store';

export default function ChatWindow() {
  const { connected } = useStore();

  return (
    <div className="w-full h-full flex flex-col glass-strong rounded-3xl shadow-float overflow-hidden">
      {/* Glassmorphic Header */}
      <div className="glass-dark border-b border-white/10 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md animate-glow-pulse" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold ring-2 ring-white/20">
                @
              </div>
            </div>
            <div>
              <div className="font-bold text-lg text-gradient-purple">Evelyn</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                {connected ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Active now</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    <span>Reconnecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Context Usage Indicator */}
            <ContextUsageIndicator />
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <MessageInput />
    </div>
  );
}
