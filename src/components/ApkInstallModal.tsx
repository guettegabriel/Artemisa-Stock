import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  HardDriveDownload,
  Upload,
  RefreshCw,
  Info,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { exportBackupData, importBackupData, resetAllData } from '../services/storage';
import { Article, StockMovement } from '../types';

interface ApkInstallModalProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDataRestored: (articles: Article[], movements: StockMovement[]) => void;
}

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
  onDataRestored,
}) => {
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    const json = exportBackupData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARTEMISA_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setBackupMsg('Copia de seguridad descargada exitosamente en formato JSON.');
    setTimeout(() => setBackupMsg(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBackupData(content);
      if (res.success && res.articles) {
        onDataRestored(res.articles, res.movements || []);
        setBackupMsg(res.message);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    const confirmReset = window.confirm(
      '¿Estás seguro de restablecer los datos del inventario a los valores de demostración iniciales?'
    );
    if (!confirmReset) return;

    const { articles, movements } = resetAllData();
    onDataRestored(articles, movements);
    setBackupMsg('Inventario restablecido con los datos de muestra iniciales.');
    setTimeout(() => setBackupMsg(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* APK Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalación en Dispositivos Móviles (Android / APK)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Instala ARTEMISA como App Nativa (APK)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              ARTEMISA está construido con arquitectura PWA / WebAPK de última generación. Puedes instalarla directamente en tu teléfono Android, tablet o computador para usarla a pantalla completa, con acceso instantáneo desde tu pantalla de inicio y soporte offline.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {isInstalled ? (
              <div className="px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>¡App ya instalada en este dispositivo!</span>
              </div>
            ) : isInstallable ? (
              <button
                id="btn-install-pwa-direct"
                onClick={onInstall}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span>Instalar APK / App Ahora</span>
              </button>
            ) : (
              <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-xs text-center">
                Disponible para instalar desde el menú de tu navegador
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backup Notification */}
      {backupMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Guide Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Android Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm pb-2 border-b border-slate-800">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Instrucciones para Android (Google Chrome / Samsung)</span>
          </div>

          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Abre esta aplicación desde tu navegador en Android (Chrome, Edge o Brave).
            </li>
            <li>
              Toca el botón de <strong className="text-white">Menú (los 3 puntos ⋮)</strong> en la esquina superior derecha del navegador.
            </li>
            <li>
              Selecciona la opción <strong className="text-white">"Instalar aplicación"</strong> o <strong className="text-white">"Agregar a la pantalla principal"</strong>.
            </li>
            <li>
              Android generará automáticamente el paquete <strong className="text-emerald-400">WebAPK</strong> nativo, colocando el icono de ARTEMISA en tu lista de apps con inicio instantáneo.
            </li>
          </ol>
        </div>

        {/* iPhone / iOS Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm pb-2 border-b border-slate-800">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>Instrucciones para iPhone / iPad (Safari)</span>
          </div>

          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Abre esta aplicación en el navegador <strong className="text-white">Safari</strong>.
            </li>
            <li>
              Toca el icono de <strong className="text-white">Compartir (cuadrado con flecha hacia arriba)</strong> en la barra inferior.
            </li>
            <li>
              Desplázate hacia abajo y pulsa en <strong className="text-white">"Agregar a pantalla de inicio"</strong>.
            </li>
            <li>
              Confirma tocando <strong className="text-blue-400">"Agregar"</strong> en la esquina superior derecha.
            </li>
          </ol>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <WifiOff className="w-4 h-4 text-amber-400 mb-1.5" />
          <h4 className="font-bold text-white mb-1">Capacidad Offline</h4>
          <p className="text-slate-400">
            Tus artículos y movimientos quedan guardados localmente para consultarlos y editarlos sin depender de conexión.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1.5" />
          <h4 className="font-bold text-white mb-1">Datos Seguros</h4>
          <p className="text-slate-400">
            Información protegida en tu dispositivo, con posibilidad de exportar copias de seguridad en cualquier momento.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <HardDriveDownload className="w-4 h-4 text-blue-400 mb-1.5" />
          <h4 className="font-bold text-white mb-1">Respaldo Inmediato</h4>
          <p className="text-slate-400">
            Descarga un archivo JSON de respaldo de todo tu inventario y restáuralo en cualquier teléfono o PC.
          </p>
        </div>
      </div>

      {/* Backup & Restore Tools */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
          <HardDriveDownload className="w-4 h-4 text-blue-400" />
          <span>Copia de Seguridad y Restauración de Datos</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Copia de Seguridad (JSON)</span>
          </button>

          <label className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition text-center">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Restaurar desde Archivo</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={handleResetData}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            title="Restablecer inventario con datos de ejemplo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Datos Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
