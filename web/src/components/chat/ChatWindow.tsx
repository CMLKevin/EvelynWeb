import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ContextUsageIndicator from '../common/ContextUsageIndicator';
import AgentApprovalModal from '../agent/AgentApprovalModal';
import { useStore } from '../../state/store';

export default function ChatWindow() {
  const { connected } = useStore();

  return (
    <div className="w-full h-full flex flex-col terminal-panel rounded overflow-hidden relative z-10">
      {/* Terminal Header */}
      <div className="terminal-header p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 terminal-glow font-bold">$ evelyn://chat</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Context Usage Indicator */}
        <ContextUsageIndicator />
      </div>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <MessageInput />

      {/* Agent Approval Modal */}
      <AgentApprovalModal />
    </div>
  );
}
