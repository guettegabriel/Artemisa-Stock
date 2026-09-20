import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  PlusCircle,
  Calendar,
} from 'lucide-react';
import { StockMovement, MovementType } from '../types';

interface MovementsLogProps {
  movements: StockMovement[];
}

export const MovementsLog: React.FC<MovementsLogProps> = ({ movements }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      const matchSearch =
        mov.articleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.articleDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mov.documentNumber && mov.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (mov.partnerName && mov.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (mov.reason && mov.reason.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = filterType === 'all' || mov.type === filterType;

      return matchSearch && matchType;
    });
  }, [movements, searchTerm, filterType]);

  const handleExportCsv = () => {
    if (movements.length === 0) return;

    const headers = [
      'Fecha',
      'Hora',
      'Tipo',
      'Código',
      'Descripción',
      'Variación',
      'Stock Anterior',
      'Nuevo Stock',
      'Comprobante / Motivo',
      'Proveedor / Cliente',
      'Notas',
    ];

    const rows = filteredMovements.map((m) => {
      const d = new Date(m.date);
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        m.type,
        `"${m.articleCode}"`,
        `"${m.articleDescription.replace(/"/g, '""')}"`,
        m.quantityChange,
        m.previousQuantity,
        m.newQuantity,
        `"${(m.documentNumber || m.reason || '').replace(/"/g, '""')}"`,
        `"${(m.partnerName || '').replace(/"/g, '""')}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kardex_StockMaster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'carga_pdf':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
            <ArrowDownToLine className="w-3 h-3 text-emerald-400" />
            Carga PDF
          </span>
        );
      case 'descarga_pdf':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
            <ArrowUpFromLine className="w-3 h-3 text-rose-400" />
            Descarga PDF
          </span>
        );
      case 'ajuste_manual':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-max">
            <SlidersHorizontal className="w-3 h-3 text-blue-400" />
            Ajuste Manual
          </span>
        );
      case 'alta_articulo':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-max">
            <PlusCircle className="w-3 h-3 text-purple-400" />
            Alta Inicial
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Historial de Movimientos y Auditoría (Kardex)
            </h2>
            <p className="text-xs text-slate-400">
              Registro inmutable de cargas por PDF, descargas, ajustes manuales y altas.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={movements.length === 0}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition active:scale-95 disabled:opacity-40"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, comprobante, proveedor o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'carga_pdf', label: 'Cargas PDF' },
            { id: 'descarga_pdf', label: 'Descargas PDF' },
            { id: 'ajuste_manual', label: 'Ajustes Manuales' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Table / Cards */}
      {filteredMovements.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          No hay movimientos que coincidan con el criterio de búsqueda.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Artículo</th>
                  <th className="py-3 px-3 text-center">Variación</th>
                  <th className="py-3 px-3 text-center">Stock Resultante</th>
                  <th className="py-3 px-4">Comprobante / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMovements.map((mov) => {
                  const date = new Date(mov.date);
                  const isPositive = mov.quantityChange > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-slate-800/30 transition">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{date.toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 pl-5">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getMovementBadge(mov.type)}
                      </td>

                      {/* Article */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-300 block">
                          {mov.articleCode}
                        </span>
                        <span className="text-slate-300 text-[11px] line-clamp-1 max-w-[200px]">
                          {mov.articleDescription}
                        </span>
                      </td>

                      {/* Quantity Change */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                        </span>
                      </td>

                      {/* Resulting Stock */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono">
                        <span className="text-slate-400 text-[10px] block">
                          (era {mov.previousQuantity})
                        </span>
                        <span className="font-extrabold text-white text-xs">
                          {mov.newQuantity}
                        </span>
                      </td>

                      {/* Document / Reason / Notes */}
                      <td className="py-3 px-4 text-slate-300 text-[11px]">
                        {mov.documentNumber && (
                          <div className="font-semibold text-white">
                            {mov.documentType ? `${mov.documentType} ` : ''}
                            {mov.documentNumber}
                          </div>
                        )}
                        {mov.partnerName && (
                          <div className="text-slate-400 text-[10px]">
                            {mov.partnerName}
                          </div>
                        )}
                        {mov.reason && (
                          <div className="text-blue-300 font-medium">
                            {mov.reason}
                          </div>
                        )}
                        {mov.notes && (
                          <div className="text-slate-400 italic text-[10px] mt-0.5">
                            "{mov.notes}"
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
