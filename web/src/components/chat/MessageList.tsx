import { useEffect, useRef } from 'react';
import { useStore } from '../../state/store';
import SearchResultBubble from './SearchResultBubble';
import MarkdownRenderer from '../common/MarkdownRenderer';
import TruncationIndicator from './TruncationIndicator';

export default function MessageList() {
  const { messages, currentMessage, searchResults } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {messages.length === 0 && !currentMessage && (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-2xl opacity-50 animate-glow-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-5xl font-bold shadow-2xl ring-4 ring-white/10 animate-float">
              E
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-3 text-gradient-purple">
            Welcome to Evelyn
          </h2>
          <p className="text-gray-400 text-center max-w-md leading-relaxed mb-6">
            Your evolving AI companion who remembers, thinks, and grows with you.
            <br />
            <span className="text-white mt-2 inline-block">Start a conversation!</span>
          </p>
          
          <div className="flex gap-3 flex-wrap justify-center">
            <div className="glass-purple rounded-2xl px-5 py-3 shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <span className="text-lg mr-2">💭</span>
              <span className="text-sm text-white/90">Deep thoughts</span>
            </div>
            <div className="glass-purple rounded-2xl px-5 py-3 shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <span className="text-lg mr-2">🧠</span>
              <span className="text-sm text-white/90">True memory</span>
            </div>
            <div className="glass-purple rounded-2xl px-5 py-3 shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <span className="text-lg mr-2">✨</span>
              <span className="text-sm text-white/90">Evolves daily</span>
            </div>
          </div>
        </div>
      )}

      {/* Truncation Indicator - shows when context has been optimized */}
      {messages.length > 0 && <TruncationIndicator />}

      {/* Render messages and search results interleaved by timestamp */}
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        
        // Check if there are any search results that should appear after this message
        const relevantSearchResults = searchResults.filter(sr => {
          // Show search results between this message and the next one
          const msgTime = new Date(msg.createdAt).getTime();
          const nextMsg = messages[index + 1];
          const nextMsgTime = nextMsg ? new Date(nextMsg.createdAt).getTime() : Date.now() + 1000000;
          const srTime = new Date(sr.timestamp).getTime();
          return srTime > msgTime && srTime < nextMsgTime;
        });
        const isFirstInGroup = index === 0 || messages[index - 1].role !== msg.role;

        return (
          <div key={`msg-group-${msg.id}`}>
            <div
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} ${
                isFirstInGroup ? 'mt-6' : 'mt-1'
              } animate-slide-in-${isUser ? 'right' : 'left'}`}
            >
            {/* Avatar - only for first message in group */}
            {!isUser && isFirstInGroup && (
              <div className="flex-shrink-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md group-hover:blur-lg transition-all" />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold ring-2 ring-white/10 shadow-lg">
                    E
                  </div>
                </div>
              </div>
            )}
            
            {/* Spacer for non-first messages */}
            {!isUser && !isFirstInGroup && <div className="w-10 flex-shrink-0" />}

            {/* Message Bubble */}
            <div className={`relative max-w-[70%] min-w-0 ${isUser ? 'ml-auto' : ''}`}>
              {/* Name and timestamp - only for first in group */}
              {isFirstInGroup && (
                <div className={`flex items-center gap-2 mb-1 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-xs font-semibold ${
                    isUser ? 'text-blue-400' : 'text-gradient-purple'
                  }`}>
                    {isUser ? 'You' : 'Evelyn'}
                  </span>
                  {!isUser && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] font-bold rounded uppercase tracking-wide">
                      AI
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              )}

              {/* Speech Bubble */}
              <div className={`relative group ${isUser ? 'glass-blue' : 'glass-purple'} rounded-3xl px-5 py-3 shadow-lg hover:shadow-xl transition-all overflow-hidden`}>
                {/* Bubble tail - only for first in group */}
                {isFirstInGroup && (
                  <div className={`absolute ${
                    isUser 
                      ? 'right-0 -mr-2 top-3' 
                      : 'left-0 -ml-2 top-3'
                  }`}>
                    <svg width="12" height="20" viewBox="0 0 12 20">
                      <path
                        d={isUser 
                          ? "M 0 0 Q 12 10 0 20" 
                          : "M 12 0 Q 0 10 12 20"
                        }
                        fill={isUser 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(168, 85, 247, 0.1)'
                        }
                        className="backdrop-blur-sm"
                      />
                    </svg>
                  </div>
                )}

                {/* Message content with markdown support */}
                <div className={`text-[15px] leading-relaxed break-words overflow-hidden ${
                  isUser ? 'text-white' : 'text-white'
                }`} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {isUser ? (
                    // User messages: plain text (no markdown)
                    <span className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.content}</span>
                  ) : (
                    // Evelyn's messages: render markdown
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>

                {/* Hover overlay with actions */}
                <div className="absolute -top-8 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button className="glass-dark w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="text-xs">❤️</span>
                  </button>
                  <button className="glass-dark w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="text-xs">⋯</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar for user - only for first message in group */}
            {isUser && isFirstInGroup && (
              <div className="flex-shrink-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-md group-hover:blur-lg transition-all" />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-sm font-bold ring-2 ring-white/10 shadow-lg">
                    U
                  </div>
                </div>
              </div>
            )}

            {/* Spacer for non-first user messages */}
            {isUser && !isFirstInGroup && <div className="w-10 flex-shrink-0" />}
            </div>
            
            {/* Render search results that belong after this message */}
            {relevantSearchResults.map((sr) => (
              <SearchResultBubble key={sr.id} {...sr} />
            ))}
          </div>
        );
      })}

      {/* Typing indicator */}
      {currentMessage && (
        <div className="flex gap-3 justify-start animate-slide-in-left">
          <div className="flex-shrink-0">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md animate-glow-pulse" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold ring-2 ring-white/10 shadow-lg">
                E
              </div>
            </div>
          </div>

          <div className="relative max-w-[70%] min-w-0">
            <div className="flex items-center gap-2 mb-1 px-2">
              <span className="text-xs font-semibold text-gradient-purple">Evelyn</span>
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] font-bold rounded uppercase tracking-wide">
                AI
              </span>
              <span className="text-[10px] text-purple-400 flex items-center gap-1">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                typing...
              </span>
            </div>

            <div className="relative glass-purple rounded-3xl px-5 py-3 shadow-lg overflow-hidden">
              <div className="absolute left-0 -ml-2 top-3">
                <svg width="12" height="20" viewBox="0 0 12 20">
                  <path
                    d="M 12 0 Q 0 10 12 20"
                    fill="rgba(168, 85, 247, 0.1)"
                    className="backdrop-blur-sm"
                  />
                </svg>
              </div>

              <div className="text-[15px] leading-relaxed text-white break-words overflow-hidden" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <MarkdownRenderer content={currentMessage} />
                <span className="inline-block w-0.5 h-4 bg-purple-400 ml-1 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
