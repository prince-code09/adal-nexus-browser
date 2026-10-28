import React from 'react';
import {
  Home,
  Bookmark,
  History,
  Download,
  Puzzle,
  Settings,
  Bot,
} from 'lucide-react';

export type SidebarTab =
  | 'home'
  | 'bookmarks'
  | 'history'
  | 'downloads'
  | 'extensions'
  | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  onOpenAgentModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAgentModal,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'history', label: 'History', icon: History },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'extensions', label: 'Extensions', icon: Puzzle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-[72px] bg-[#080b14]/95 border-r border-white/[0.05] flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`group flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-violet-300' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom: AI Agent Feature Button */}
      <div className="w-full px-2">
        <button
          type="button"
          onClick={onOpenAgentModal}
          className="group flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-violet-950/40 to-purple-900/30 hover:to-purple-900/50 text-violet-300 border border-violet-500/40 hover:border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-200"
          title="AdaL Nexus AI Agent"
        >
          <Bot className="w-5 h-5 mb-1 text-violet-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          <span className="text-[10px] font-semibold text-violet-200 tracking-tight">
            AI Agent
          </span>
        </button>
      </div>
    </aside>
  );
};
