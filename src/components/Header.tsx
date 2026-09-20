import React from 'react';
import { Package, AlertTriangle, Boxes, Download, Smartphone } from 'lucide-react';
import { Article } from '../types';

interface HeaderProps {
  articles: Article[];
  onOpenApkModal: () => void;
  isInstallable: boolean;
  onInstallClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  articles,
  onOpenApkModal,
  isInstallable,
  onInstallClick,
}) => {
  const totalArticles = articles.length;
  const totalStock = articles.reduce((acc, a) => acc + (a.quantity || 0), 0);
  const lowStockCount = articles.filter(
    (a) => a.quantity >= 0 && a.quantity <= (a.minStock || 0)
  ).length;
  const negativeStockCount = articles.filter((a) => a.quantity < 0).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Brand & APK identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-lg">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    ARTEMISA
                  </h1>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    APK
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Control de Stock • Carga/Descarga PDF • Ajuste Manual
                </p>
              </div>
            </div>

            {/* Mobile APK Action */}
            <div className="sm:hidden flex items-center gap-2">
              {isInstallable ? (
                <button
                  id="btn-install-apk-header-mobile"
                  onClick={onInstallClick}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white flex items-center gap-1.5 shadow active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar
                </button>
              ) : (
                <button
                  id="btn-open-apk-info-mobile"
                  onClick={onOpenApkModal}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                  title="Opciones de APK / PWA"
                >
                  <Smartphone className="w-4 h-4 text-blue-400" />
                </button>
              )}
            </div>
          </div>

          {/* Metrics summary pills */}
          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs shrink-0">
              <Package className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Artículos:</span>
              <span className="font-semibold text-slate-200">{totalArticles}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs shrink-0">
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Unidades:</span>
              <span className="font-semibold text-slate-200">{totalStock}</span>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shrink-0 ${
                lowStockCount > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
              }`}
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  lowStockCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'
                }`}
              />
              <span className={lowStockCount > 0 ? 'text-amber-300' : 'text-slate-400'}>
                Stock Bajo:
              </span>
              <span className="font-bold">{lowStockCount}</span>
            </div>

            {negativeStockCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-purple-500/15 border-purple-500/40 text-purple-300 text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="font-medium">Negativo:</span>
                <span className="font-bold font-mono">{negativeStockCount}</span>
              </div>
            )}

            {/* Desktop APK Button */}
            <button
              id="btn-apk-info-desktop"
              onClick={onOpenApkModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-medium transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Instalar APK</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
