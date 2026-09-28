'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CalendarDays, 
  BarChart3, 
  Boxes 
} from 'lucide-react';

export type NavTab = 'dashboard' | 'input' | 'planning' | 'reports' | 'skus';

interface BottomNavProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'input' as NavTab,
      label: 'Input Hasil',
      icon: PlusCircle,
      isPrimary: true,
    },
    {
      id: 'planning' as NavTab,
      label: 'Plan',
      icon: CalendarDays,
    },
    {
      id: 'reports' as NavTab,
      label: 'Laporan',
      icon: BarChart3,
    },
    {
      id: 'skus' as NavTab,
      label: 'Database',
      icon: Boxes,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl safe-area-bottom">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
              >
                <div
                  className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-rose-600/50 ring-4 ring-rose-500/20'
                      : 'bg-rose-500 text-white shadow-rose-500/30 group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <span
                  className={`text-[10px] mt-1 font-bold ${
                    isActive ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors focus:outline-none ${
                isActive
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
