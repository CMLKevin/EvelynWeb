import { useState, useEffect } from 'react';
import { localStorageManager } from '../../lib/localStorage';
import { syncManager } from '../../lib/syncManager';
import { useStore } from '../../state/store';

export default function SyncStatusPanel() {
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { performFullSync, saveToLocalStorage } = useStore();

  useEffect(() => {
    updateInfo();
    const interval = setInterval(updateInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateInfo = () => {
    const info = localStorageManager.getStorageInfo();
    setStorageInfo(info);
    
    const metadata = localStorageManager.getMetadata();
    if (metadata) {
      setLastSync(metadata.lastSync);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await performFullSync();
      console.log('Manual sync result:', result);
      updateInfo();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
    setIsSyncing(false);
  };

  const handleManualSave = () => {
    saveToLocalStorage();
    updateInfo();
  };

  const handleExport = () => {
    const data = syncManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evelyn-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const success = await syncManager.importData(text);
      if (success) {
        alert('Data imported successfully!');
        updateInfo();
      } else {
        alert('Import failed. Please check the file format.');
      }
    };
    input.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="glass-strong rounded-3xl p-5 shadow-float animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gradient-purple">Sync Status</h2>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      </div>

      {/* Storage Usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>LocalStorage Usage</span>
          <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {storageInfo.percentage.toFixed(1)}% used
        </div>
      </div>

      {/* Last Sync */}
      {lastSync && (
        <div className="mb-4 text-sm">
          <span className="text-gray-400">Last Sync:</span>
          <div className="text-white mt-1">
            {new Date(lastSync).toLocaleString()}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full glass hover:glass-strong px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
        >
          <span className="text-sm">
            {isSyncing ? '🔄 Syncing...' : '🔄 Manual Sync'}
          </span>
        </button>

        <button
          onClick={handleManualSave}
          className="w-full glass hover:glass-strong px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
        >
          <span className="text-sm">💾 Save Now</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="glass hover:glass-strong px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <span className="text-xs">📤 Export</span>
          </button>

          <button
            onClick={handleImport}
            className="glass hover:glass-strong px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <span className="text-xs">📥 Import</span>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 glass-dark rounded-2xl">
        <div className="text-xs text-gray-400 space-y-1">
          <div>✅ Auto-save: Every 30s</div>
          <div>✅ Conflict resolution: Automatic</div>
          <div>✅ Backup: LocalStorage + Server</div>
        </div>
      </div>
    </div>
  );
}

