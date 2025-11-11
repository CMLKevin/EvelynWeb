import { useStore } from '../../state/store';
import { MessageSquare, Activity, ScrollText } from 'lucide-react';

export default function Tabs() {
  const { uiState, setActiveTab } = useStore();

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'logs' as const, label: 'Logs', icon: ScrollText },
    { id: 'diagnostics' as const, label: 'Diagnostics', icon: Activity },
  ];

  return (
    <div className="terminal-tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`terminal-tab ${uiState.activeTab === tab.id ? 'active' : ''}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

