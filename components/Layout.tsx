import React from 'react';
import { AppTab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  
  const tabs = [
    { id: AppTab.GARDEN, icon: '🌿', label: 'Garden' },
    { id: AppTab.IDENTIFY, icon: '📷', label: 'Scan' },
    { id: AppTab.TOOLS, icon: '🌦️', label: 'Tools' },
    { id: AppTab.CHAT, icon: '💬', label: 'Ask' },
    { id: AppTab.SETTINGS, icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-6 bg-gray-900 border-b border-white/5 shadow-xl">
        <h1 className="text-xl font-bold tracking-wide flex items-center gap-2 drop-shadow-md text-white">
          <span className="text-2xl filter drop-shadow-lg">🌿</span> AI Plant Care
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth pt-20 pb-28 px-2">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] pb-safe">
        <div className="flex justify-around items-center w-full max-w-lg mx-auto h-20 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90 ${
                activeTab === tab.id 
                  ? 'text-emerald-400 -translate-y-1' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className={`text-2xl mb-1 filter transition-all ${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] scale-110' : 'grayscale opacity-70'}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium tracking-wide ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;