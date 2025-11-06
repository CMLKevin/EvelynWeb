import { useState, useEffect } from 'react';

interface Memory {
  id: number;
  type: string;
  text: string;
  importance: number;
  privacy: string;
  createdAt: string;
}

export default function MemoryTimeline() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchMemories();
  }, [filter]);

  const fetchMemories = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/memories?limit=50' 
        : `/api/memories?type=${filter}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data);
      setSelectedIds(new Set()); // Clear selection on refresh
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    }
  };

  const deleteMemory = async (id: number) => {
    if (!confirm('Delete this memory? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setMemories(memories.filter(m => m.id !== id));
        console.log(`Deleted memory #${id}`);
      } else {
        alert('Failed to delete memory');
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
      alert('Error deleting memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Delete ${selectedIds.size} selected memories? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch('/api/memories/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      
      if (res.ok) {
        setMemories(memories.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        console.log(`Bulk deleted ${selectedIds.size} memories`);
      } else {
        alert('Failed to delete memories');
      }
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      alert('Error deleting memories');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    if (selectedIds.size === memories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(memories.map(m => m.id)));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'episodic': return 'from-blue-500 to-cyan-500';
      case 'semantic': return 'from-green-500 to-emerald-500';
      case 'preference': return 'from-purple-500 to-violet-500';
      case 'insight': return 'from-yellow-500 to-amber-500';
      case 'plan': return 'from-red-500 to-orange-500';
      case 'relational': return 'from-pink-500 to-rose-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const types = ['all', 'episodic', 'semantic', 'preference', 'insight', 'plan', 'relational'];

  return (
    <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
      {/* Filter pills - Sticky at top */}
      <div className="glass-strong rounded-3xl p-3 shadow-float sticky top-0 z-10 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2 mb-3">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === type
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                  : 'glass text-gray-400 hover:text-white hover:scale-105'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {memories.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              onClick={selectAll}
              className="glass hover:glass-strong px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
            >
              {selectedIds.size === memories.length ? '✓ Deselect All' : 'Select All'}
            </button>
            
            {selectedIds.size > 0 && (
              <>
                <div className="text-xs text-gray-400">
                  {selectedIds.size} selected
                </div>
                <button
                  onClick={bulkDelete}
                  disabled={isDeleting}
                  className="glass-dark hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs text-red-400 transition-all hover:scale-105 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Memory cards */}
      {memories.length === 0 ? (
        <div className="glass-strong rounded-3xl p-8 text-center shadow-float animate-fade-in">
          <div className="text-4xl mb-3">🧠</div>
          <div className="text-sm text-gray-400">No memories yet</div>
          <div className="text-xs text-gray-500 mt-2">
            Memories will appear here as you chat with Evelyn
          </div>
        </div>
      ) : (
        memories.map((memory, index) => (
          <div
            key={memory.id}
            className={`glass-strong rounded-2xl p-4 shadow-float hover:shadow-xl transition-all animate-fade-in group ${
              selectedIds.has(memory.id) ? 'ring-2 ring-purple-500' : ''
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => toggleSelection(memory.id)}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedIds.has(memory.id)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-600 hover:border-purple-500'
                }`}
              >
                {selectedIds.has(memory.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Type badge */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${getTypeColor(memory.type)} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                {memory.type[0].toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-white capitalize">{memory.type}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-transparent" />
                  <span className="text-xs text-gray-500">{(memory.importance * 100).toFixed(0)}%</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                    memory.privacy === 'private' ? 'bg-red-500/20 text-red-400' :
                    memory.privacy === 'ephemeral' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {memory.privacy}
                  </span>
                </div>

                {/* Memory text - expandable */}
                <p 
                  className={`text-xs text-gray-300 leading-relaxed cursor-pointer ${
                    expandedId === memory.id ? '' : 'line-clamp-2'
                  }`}
                  onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                >
                  {memory.text}
                </p>

                {memory.text.length > 150 && (
                  <button
                    onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                    className="text-xs text-purple-400 hover:text-purple-300 mt-1"
                  >
                    {expandedId === memory.id ? 'Show less' : 'Show more...'}
                  </button>
                )}

                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                  <span>ID: {memory.id}</span>
                  <span>•</span>
                  <span>{new Date(memory.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Delete button - appears on hover or selection */}
              <button
                onClick={() => deleteMemory(memory.id)}
                disabled={isDeleting}
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  selectedIds.has(memory.id) || 'opacity-0 group-hover:opacity-100'
                } glass-dark hover:bg-red-500/20 disabled:opacity-50`}
                title="Delete memory"
              >
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
