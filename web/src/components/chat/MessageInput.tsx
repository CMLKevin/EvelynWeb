import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { wsClient } from '../../lib/ws';
import { useStore } from '../../state/store';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { connected, addMessage } = useStore();

  const handleSend = () => {
    if (!input.trim() || !connected) return;

    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: input.trim(),
      createdAt: new Date().toISOString()
    };

    addMessage(userMessage);
    wsClient.sendMessage(input.trim());
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const charLimit = 2000;
  const charPercentage = (input.length / charLimit) * 100;

  return (
    <div className="p-6 pt-4">
      <div className={`glass-dark rounded-3xl shadow-lg transition-all duration-300 ${
        isFocused ? 'ring-2 ring-purple-500/50 shadow-2xl' : ''
      }`}>
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={connected ? `Message Evelyn...` : 'Connecting...'}
            disabled={!connected}
            maxLength={charLimit}
            className="w-full bg-transparent text-white px-6 pt-5 pb-4 resize-none outline-none placeholder-gray-500 text-[15px] leading-relaxed min-h-[80px] max-h-[200px]"
            rows={1}
          />
          
          {/* Character counter - only show when approaching limit */}
          {charPercentage > 70 && (
            <div className="absolute top-4 right-4 opacity-60">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="absolute inset-0 w-8 h-8 -rotate-90">
                <circle
                    cx="16"
                    cy="16"
                    r="14"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="2"
                />
                <circle
                    cx="16"
                    cy="16"
                    r="14"
                  fill="none"
                    stroke={charPercentage > 95 ? '#ef4444' : charPercentage > 85 ? '#f59e0b' : '#a855f7'}
                  strokeWidth="2"
                    strokeDasharray={`${charPercentage * 0.88} 88`}
                  className="transition-all duration-300"
                />
              </svg>
                <span className={`text-[9px] font-bold ${
                  charPercentage > 95 ? 'text-red-400' : charPercentage > 85 ? 'text-amber-400' : 'text-purple-400'
              }`}>
                  {charLimit - input.length}
              </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            {!connected ? (
              <span className="text-xs text-red-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                Reconnecting...
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">Enter</kbd> to send
              </span>
            )}
          </div>
          
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected}
            className={`relative group overflow-hidden rounded-2xl px-8 py-2.5 font-semibold transition-all duration-300 ${
              !input.trim() || !connected
                ? 'glass opacity-30 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-2xl hover:scale-105'
            }`}
          >
            {/* Shimmer effect */}
            {input.trim() && connected && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            
            <span className="relative flex items-center gap-2 text-white text-sm">
              <span>Send</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Hint text */}
      <div className="mt-3 px-2 text-center">
        <p className="text-xs text-gray-500">
          Evelyn remembers your conversations and evolves her personality over time
          <span className="text-purple-400 ml-1">✨</span>
        </p>
      </div>
    </div>
  );
}
