import React from 'react';
import { Package, FileText, SlidersHorizontal, History, Smartphone } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  pendingPdfCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const tabs = [
    {
      id: 'articulos' as ActiveTab,
      label: 'Artículos',
      shortLabel: 'Stock',
      icon: Package,
      badge: undefined,
    },
    {
      id: 'pdf' as ActiveTab,
      label: 'Leer PDF (Carga / Descarga)',
      shortLabel: 'Leer PDF',
      icon: FileText,
      highlight: true,
    },
    {
      id: 'ajuste' as ActiveTab,
      label: 'Ajuste Manual',
      shortLabel: 'Ajuste',
      icon: SlidersHorizontal,
    },
    {
      id: 'historial' as ActiveTab,
      label: 'Historial Movimientos',
      shortLabel: 'Kardex',
      icon: History,
    },
    {
      id: 'apk' as ActiveTab,
      label: 'Instalar APK',
      shortLabel: 'APK',
      icon: Smartphone,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Tab Navigation */}
      <nav className="hidden md:block bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-2 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-desktop-${tab.id}`}
                  onClick={() => onChangeTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (APK style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 safe-area-pb">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-mobile-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 transition-all ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive ? 'bg-blue-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium mt-0.5 tracking-tight">
                  {tab.shortLabel}
                </span>

                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
