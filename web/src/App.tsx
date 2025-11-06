import { useEffect, useState } from 'react';
import { useStore } from './state/store';
import { wsClient } from './lib/ws';
import { localStorageManager } from './lib/localStorage';
import Sidebar from './components/sidebar/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import DiagnosticsPanel from './components/panels/DiagnosticsPanel';

export default function App() {
  const { showDiagnostics, loadMessages, loadSearchResults, syncWithLocalStorage, saveToLocalStorage } = useStore();
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    // Perform startup sync
    const initializeApp = async () => {
      setSyncStatus('Syncing data...');
      
      try {
        // Sync LocalStorage with Server
        const syncResult = await syncWithLocalStorage();
        console.log('[App] Sync result:', syncResult);
        
        if (syncResult) {
          setSyncStatus(`Synced: ${syncResult.action}`);
          setTimeout(() => setSyncStatus(''), 5000);
        }
        
        // Load all data
        await loadMessages();
        await loadSearchResults();
        
        // Start auto-save to LocalStorage
        localStorageManager.startAutoSave(() => {
          const state = useStore.getState();
          return {
            messages: state.messages,
            searchResults: state.searchResults,
            personality: state.personality,
            activities: state.activities
          };
        });
        
      } catch (error) {
        console.error('[App] Initialization error:', error);
        setSyncStatus('Sync failed, using server data');
      }
    };
    
    initializeApp();
    
    // Connect to WebSocket
    wsClient.connect();
    
    return () => {
      wsClient.disconnect();
      localStorageManager.stopAutoSave();
    };
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Sync Status Toast */}
      {syncStatus && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="glass-strong px-6 py-3 rounded-2xl shadow-float border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-sm text-white font-medium">{syncStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl top-20 left-20 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute w-96 h-96 bg-pink-500/10 rounded-full blur-3xl bottom-20 right-20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute w-64 h-64 bg-blue-500/10 rounded-full blur-3xl top-1/2 left-1/2 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 gap-4 p-4 min-w-0">
        <Sidebar />
        <div className="flex-1 min-w-[400px] max-w-full">
          <ChatWindow />
        </div>
        {showDiagnostics && (
          <div className="flex-shrink-0">
            <DiagnosticsPanel />
          </div>
        )}
      </div>
    </div>
  );
}

