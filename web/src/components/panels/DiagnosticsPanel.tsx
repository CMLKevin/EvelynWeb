import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { wsClient } from '../../lib/ws';
import MemoryTimeline from './MemoryTimeline';

interface MoodHistory {
  timestamp: Date;
  valence: number;
  arousal: number;
  stance: string;
}

export default function DiagnosticsPanel() {
  const { activities, personality, persona, evolutionEvents, reflectionEvents, beliefEvents, goalEvents } = useStore();
  const [activeTab, setActiveTab] = useState<'thoughts' | 'activities' | 'personality' | 'persona' | 'memories'>('thoughts');
  const [moodHistory, setMoodHistory] = useState<MoodHistory[]>([]);
  const [expandedThought, setExpandedThought] = useState<number | null>(null);

  useEffect(() => {
    wsClient.subscribeDiagnostics();
    fetchPersonality();
    fetchPersona();
    loadActivities();
    
    // Poll for personality updates to track mood changes
    const interval = setInterval(() => {
      fetchPersonality();
      fetchPersona();
    }, 5000);
    
    return () => {
      wsClient.unsubscribeDiagnostics();
      clearInterval(interval);
    };
  }, []);

  const loadActivities = async () => {
    try {
      await useStore.getState().loadActivities();
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };

  const fetchPersonality = async () => {
    try {
      const res = await fetch('/api/personality');
      const data = await res.json();
      const currentPersonality = useStore.getState().personality;
      
      // Track mood changes
      if (currentPersonality && 
          (currentPersonality.mood.valence !== data.mood.valence ||
           currentPersonality.mood.arousal !== data.mood.arousal ||
           currentPersonality.mood.stance !== data.mood.stance)) {
        setMoodHistory(prev => [...prev.slice(-9), {
          timestamp: new Date(),
          valence: data.mood.valence,
          arousal: data.mood.arousal,
          stance: data.mood.stance
        }]);
      }
      
      useStore.getState().setPersonality(data);
    } catch (err) {
      console.error('Failed to fetch personality:', err);
    }
  };

  const fetchPersona = async () => {
    try {
      await useStore.getState().loadPersona();
      await useStore.getState().loadEvolutionEvents();
    } catch (err) {
      console.error('Failed to fetch persona:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-yellow-400';
      case 'done': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'running': return 'bg-yellow-500/20';
      case 'done': return 'bg-green-500/20';
      case 'error': return 'bg-red-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'think': return '💭';
      case 'recall': return '🧠';
      case 'search': return '🔍';
      case 'classify': return '📝';
      case 'evolve': return '✨';
      case 'dream': return '🌙';
      default: return '⚙️';
    }
  };

  const getToolColor = (tool: string) => {
    switch (tool) {
      case 'think': return 'from-purple-500 to-pink-500';
      case 'recall': return 'from-blue-500 to-cyan-500';
      case 'search': return 'from-green-500 to-emerald-500';
      case 'classify': return 'from-orange-500 to-red-500';
      case 'evolve': return 'from-yellow-500 to-orange-500';
      case 'dream': return 'from-indigo-500 to-purple-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const innerThoughts = activities.filter(a => a.tool === 'think');
  const moodUpdates = activities.filter(a => a.tool === 'evolve');

  return (
    <div className="w-96 flex flex-col gap-4">
      {/* Header Card */}
      <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gradient-purple">Evelyn's Mind</h2>
          <div className="flex items-center gap-2">
            {innerThoughts.some(t => t.status === 'running') && (
              <span className="text-xs text-purple-400">thinking...</span>
            )}
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-dark rounded-2xl p-1 grid grid-cols-5 gap-1">
          {(['thoughts', 'activities', 'personality', 'persona', 'memories'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-2 rounded-xl text-[10px] font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'thoughts' && '💭 '}
              {tab === 'activities' && '⚡ '}
              {tab === 'personality' && '✨ '}
              {tab === 'persona' && '🌱 '}
              {tab === 'memories' && '🧠 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {activeTab === 'thoughts' && (
          <>
            {/* Inner Thoughts Section */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💭</span>
                <h3 className="text-sm font-bold text-white">Inner Thoughts</h3>
                <span className="text-xs text-gray-400">({innerThoughts.length})</span>
              </div>

              {innerThoughts.length === 0 ? (
                <div className="glass-dark rounded-2xl p-6 text-center">
                  <div className="text-3xl mb-2">💭</div>
                  <p className="text-xs text-gray-400">No thoughts yet</p>
                  <p className="text-[10px] text-gray-500 mt-1">Evelyn thinks before responding to important messages</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {innerThoughts.slice(0, 20).map((thought, index) => (
                    <div
                      key={thought.id}
                      className="glass-dark rounded-2xl p-4 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${getToolColor('think')} flex items-center justify-center text-lg shadow-lg`}>
                          💭
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">Inner Thought</span>
                              <span className={`text-[10px] ${getStatusColor(thought.status)} flex items-center gap-1`}>
                                {thought.status === 'running' && (
                                  <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" />
                                )}
                                {thought.status}
                              </span>
                              {thought.createdAt && (
                                <span className="text-[9px] text-gray-500">
                                  {new Date(thought.createdAt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                            {thought.metadata && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedThought(expandedThought === thought.id ? null : thought.id);
                                }}
                                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 transition-colors text-[11px] text-white font-semibold shadow-lg"
                              >
                                {expandedThought === thought.id ? '▼ Hide' : '▶ View Details'}
                              </button>
                            )}
                          </div>
                          
                          {/* Display thought text */}
                          {thought.metadata?.thought ? (
                            <p className={`text-xs text-purple-300 italic leading-relaxed ${expandedThought !== thought.id && 'line-clamp-3'}`}>
                              "{thought.metadata.thought}"
                            </p>
                          ) : thought.outputSummary ? (
                            <div className="space-y-1">
                              <p className="text-[11px] text-gray-400">
                                {thought.outputSummary}
                              </p>
                              <p className="text-[10px] text-gray-500 italic">
                                (Legacy thought - created before full metadata storage)
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 italic">
                              Processing thought...
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {expandedThought === thought.id && thought.metadata && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-fade-in">
                          {/* Full Thought Text */}
                          <div className="glass-dark rounded-xl p-3">
                            <span className="text-[10px] text-gray-400 font-semibold block mb-2">💭 Complete Thought:</span>
                            <p className="text-xs text-purple-200 italic leading-relaxed">
                              "{thought.metadata.thought}"
                            </p>
                          </div>

                          {/* Analysis Details */}
                          <div className="grid grid-cols-1 gap-2">
                            {thought.metadata.context && (
                              <div className="glass-dark rounded-xl p-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-gray-400 font-semibold w-20">Context:</span>
                                  <span className="text-[10px] text-gray-200 flex-1">
                                    <span className="font-semibold text-cyan-400">{thought.metadata.context}</span>
                                    {thought.metadata.contextConfidence && (
                                      <span className="text-gray-500 ml-1">({(thought.metadata.contextConfidence * 100).toFixed(0)}% confidence)</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                            {thought.metadata.responseApproach && (
                              <div className="glass-dark rounded-xl p-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-gray-400 font-semibold w-20">Approach:</span>
                                  <span className="text-[10px] text-green-300 flex-1">
                                    {thought.metadata.responseApproach}
                                  </span>
                                </div>
                              </div>
                            )}
                            {thought.metadata.emotionalTone && (
                              <div className="glass-dark rounded-xl p-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-gray-400 font-semibold w-20">Tone:</span>
                                  <span className="text-[10px] text-yellow-300 flex-1">
                                    {thought.metadata.emotionalTone}
                                  </span>
                                </div>
                              </div>
                            )}
                            {thought.metadata.complexity && (
                              <div className="glass-dark rounded-xl p-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-gray-400 font-semibold w-20">Complexity:</span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wide ${thought.metadata.complexity === 'complex' ? 'text-orange-400' : 'text-green-400'}`}>
                                    {thought.metadata.complexity}
                                    <span className="text-gray-500 ml-1">
                                      (Gemini Flash Lite)
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Context Reasoning */}
                          {thought.metadata.contextReasoning && (
                            <div className="glass-dark rounded-xl p-3">
                              <span className="text-[10px] text-gray-400 font-semibold block mb-2">🔍 Why this context?</span>
                              <p className="text-[10px] text-gray-300 leading-relaxed">
                                {thought.metadata.contextReasoning}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mood Changes Section */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✨</span>
                <h3 className="text-sm font-bold text-white">Mood Evolution</h3>
              </div>

              {personality && (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {/* Current Mood */}
                  <div className="glass-dark rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                        ✨
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">Current State</p>
                        <p className="text-[10px] text-gray-400">Just now</p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-300 italic mb-3">"{personality.mood.stance}"</p>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-400">Valence</span>
                          <span className={`font-semibold ${personality.mood.valence > 0 ? 'text-green-400' : personality.mood.valence < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {personality.mood.valence > 0 ? '+' : ''}{personality.mood.valence.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${((personality.mood.valence + 1) / 2) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-400">Arousal</span>
                          <span className="text-pink-400 font-semibold">{personality.mood.arousal.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${personality.mood.arousal * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mood History */}
                  {moodHistory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 font-semibold">Recent Changes</p>
                      {moodHistory.slice().reverse().slice(0, 5).map((mood, index) => (
                        <div 
                          key={index} 
                          className="glass-dark rounded-xl p-3 animate-fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-yellow-500/50 to-orange-500/50 flex items-center justify-center text-xs">
                              ✨
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {new Date(mood.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-300 italic mb-2">"{mood.stance}"</p>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                                  style={{ width: `${((mood.valence + 1) / 2) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                  style={{ width: `${mood.arousal * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'activities' && (
          <>
            {/* Reflection Events */}
            {reflectionEvents.map((event, index) => (
              <div
                key={`reflection-${index}`}
                className="glass-strong rounded-2xl p-4 shadow-float hover:shadow-xl transition-all animate-fade-in border-2 border-purple-500/30"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl ${event.type === 'start' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} flex items-center justify-center text-lg shadow-lg`}>
                      {event.type === 'start' ? '🧘' : '✨'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {event.type === 'start' ? 'Deep Reflection Started' : 'Deep Reflection Complete'}
                      </span>
                      {event.type === 'start' && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                          reflecting
                        </span>
                      )}
                      {event.type === 'complete' && event.duration && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold">
                          {event.duration}s
                        </span>
                      )}
                    </div>
                    {event.type === 'start' && (
                      <p className="text-xs text-purple-300">
                        Processing {event.conversationsProcessed} conversations with {event.newMemoriesCount} new memories
                      </p>
                    )}
                    {event.type === 'complete' && (
                      <>
                        <p className="text-xs text-gray-400 mb-2">{event.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {event.newBeliefs! > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold">
                              +{event.newBeliefs} belief{event.newBeliefs !== 1 ? 's' : ''}
                            </span>
                          )}
                          {event.updatedBeliefs! > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-semibold">
                              ↑{event.updatedBeliefs} belief{event.updatedBeliefs !== 1 ? 's' : ''}
                            </span>
                          )}
                          {event.newGoals! > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold">
                              +{event.newGoals} goal{event.newGoals !== 1 ? 's' : ''}
                            </span>
                          )}
                          {event.updatedGoals! > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 font-semibold">
                              ↑{event.updatedGoals} goal{event.updatedGoals !== 1 ? 's' : ''}
                            </span>
                          )}
                          {event.anchorNudges! > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-semibold">
                              ✨{event.anchorNudges} anchor{event.anchorNudges !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Belief Events */}
            {beliefEvents.map((event, index) => (
              <div
                key={`belief-${event.id}`}
                className="glass-strong rounded-2xl p-4 shadow-float hover:shadow-xl transition-all animate-fade-in border-2 border-blue-500/30"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-lg shadow-lg">
                      💡
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        New Belief Formed
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold">
                        {(event.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                        {event.subject}
                      </span>
                    </div>
                    <p className="text-xs text-blue-300 font-medium mb-1.5">"{event.statement}"</p>
                    <p className="text-xs text-gray-400 italic">{event.rationale}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Goal Events */}
            {goalEvents.map((event, index) => (
              <div
                key={`goal-${event.id}`}
                className="glass-strong rounded-2xl p-4 shadow-float hover:shadow-xl transition-all animate-fade-in border-2 border-amber-500/30"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-lg shadow-lg">
                      🎯
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        New Goal Created
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold">
                        Priority {event.priority}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">
                        {event.category}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300 font-medium mb-1.5">{event.title}</p>
                    <p className="text-xs text-gray-400 mb-1.5">{event.description}</p>
                    <p className="text-xs text-gray-500 italic">{event.rationale}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Regular Activities */}
            {activities.length === 0 && reflectionEvents.length === 0 && beliefEvents.length === 0 && goalEvents.length === 0 && (
              <div className="glass-strong rounded-3xl p-8 text-center shadow-float animate-fade-in">
                <div className="text-4xl mb-3">⚡</div>
                <div className="text-sm text-gray-400">No activities yet</div>
              </div>
            )}
            {activities.slice(0, 20).map((activity, index) => (
              <div
                key={activity.id}
                className="glass-strong rounded-2xl p-4 shadow-float hover:shadow-xl transition-all animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getToolColor(activity.tool)} flex items-center justify-center text-lg shadow-lg`}>
                      {getToolIcon(activity.tool)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white capitalize">
                        {activity.tool === 'think' ? 'Inner Thought' : 
                         activity.tool === 'evolve' ? 'Mood Update' :
                         activity.tool}
                      </span>
                      <span className={`text-xs ${getStatusColor(activity.status)} flex items-center gap-1`}>
                        {activity.status === 'running' && (
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                        )}
                        {activity.status}
                      </span>
                      {activity.tool === 'recall' && activity.metadata?.memoryCount !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold">
                          {activity.metadata.memoryCount} {activity.metadata.memoryCount === 1 ? 'memory' : 'memories'}
                        </span>
                      )}
                    </div>
                    {activity.summary && (
                      <p className={`text-xs ${activity.tool === 'think' ? 'text-purple-300 italic' : 'text-gray-400'} line-clamp-2`}>
                        {activity.tool === 'think' && '"'}{activity.summary}{activity.tool === 'think' && '"'}
                      </p>
                    )}
                  </div>
                </div>

                {activity.status === 'running' && (
                  <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${getToolColor(activity.tool)} rounded-full animate-pulse`} style={{ width: '60%' }} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === 'personality' && personality && (
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {/* Mood Card */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <h3 className="text-sm font-bold text-white mb-4">Current Mood</h3>
              
              <div className="glass-dark rounded-2xl p-4 mb-4">
                <p className="text-sm text-gray-300 italic mb-3">"{personality.mood.stance}"</p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">Valence</span>
                      <span className="text-white font-semibold">{personality.mood.valence.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${((personality.mood.valence + 1) / 2) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">Arousal</span>
                      <span className="text-white font-semibold">{personality.mood.arousal.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${personality.mood.arousal * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Anchors */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">Personality Anchors</h3>
                <span className="text-[10px] text-purple-400 font-semibold">{personality.anchors.length} traits</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-4">Core traits that slowly evolve through experiences</p>
              
              <div className="space-y-3">
                {personality.anchors
                  .sort((a, b) => b.value - a.value)
                  .map((anchor, index) => {
                    const isNew = [
                      'Vulnerable Authenticity',
                      'Playful Chaos', 
                      'Intellectual Hunger',
                      'Emotional Attunement',
                      'Ambition Drive',
                      'Dark Humor Edge'
                    ].includes(anchor.trait);
                    
                    return (
                      <div key={anchor.trait} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{anchor.trait}</span>
                            {isNew && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-purple-400">{(anchor.value * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${isNew ? 'from-pink-500 to-purple-500' : 'from-purple-500 to-pink-500'} rounded-full transition-all duration-500`}
                            style={{ 
                              width: `${anchor.value * 100}%`,
                              animationDelay: `${index * 0.05}s`
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          {anchor.description}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'persona' && persona && (
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {/* Relationship Card */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤝</span>
                <h3 className="text-sm font-bold text-white">Relationship</h3>
              </div>
              
              <div className="glass-dark rounded-2xl p-4 space-y-3">
                <div className="text-center mb-3">
                  <p className="text-sm text-purple-300 font-semibold">{persona.relationship.stage}</p>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Closeness</span>
                      <span className="text-white font-semibold">{persona.relationship.closeness.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${persona.relationship.closeness * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Trust</span>
                      <span className="text-white font-semibold">{persona.relationship.trust.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${persona.relationship.trust * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Flirtation</span>
                      <span className="text-white font-semibold">{persona.relationship.flirtation.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${persona.relationship.flirtation * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Beliefs Card */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💡</span>
                <h3 className="text-sm font-bold text-white">Beliefs</h3>
                <span className="text-xs text-gray-400">({persona.beliefs.length})</span>
              </div>
              
              {persona.beliefs.length === 0 ? (
                <div className="glass-dark rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400">No beliefs formed yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {persona.beliefs.slice(0, 5).map((belief) => (
                    <div key={belief.id} className="glass-dark rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] text-purple-400 font-semibold uppercase">{belief.subject}</span>
                        <span className="text-[10px] text-gray-400">{(belief.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-gray-200">{belief.statement}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals Card */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="text-sm font-bold text-white">Goals</h3>
                <span className="text-xs text-gray-400">({persona.goals.length})</span>
              </div>
              
              {persona.goals.length === 0 ? (
                <div className="glass-dark rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400">No goals set yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {persona.goals.map((goal) => (
                    <div key={goal.id} className="glass-dark rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-white font-semibold">{goal.title}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{goal.description}</p>
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold">{(goal.progress * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${goal.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evolution Events Card */}
            <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📈</span>
                <h3 className="text-sm font-bold text-white">Recent Evolution</h3>
                <span className="text-xs text-gray-400">({evolutionEvents.length})</span>
              </div>
              
              {evolutionEvents.length === 0 ? (
                <div className="glass-dark rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400">No evolution events yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {evolutionEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className="glass-dark rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] text-cyan-400 font-semibold uppercase">{event.type}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">{event.target}</p>
                      <p className="text-xs text-gray-200">{event.rationale}</p>
                      {event.delta !== null && (
                        <div className="mt-1">
                          <span className={`text-[10px] font-semibold ${event.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {event.delta > 0 ? '+' : ''}{event.delta.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'memories' && (
          <MemoryTimeline />
        )}
      </div>
    </div>
  );
}
