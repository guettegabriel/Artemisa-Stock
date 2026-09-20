import React, { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Package,
  History,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { Article, StockMovement } from '../types';

interface ManualAdjustmentProps {
  articles: Article[];
  movements: StockMovement[];
  initialSelectedArticle?: Article | null;
  onApplyAdjustment: (params: {
    articleId: string;
    quantityChange: number;
    newQuantity: number;
    reason: string;
    notes?: string;
  }) => void;
}

const REASON_PRESETS = [
  'Recuento de inventario físico',
  'Mercadería dañada / Rota',
  'Vencimiento / Caducidad',
  'Devolución de cliente',
  'Consumo interno de taller / empresa',
  'Merma o pérdida operativa',
  'Corrección de error de carga anterior',
  'Ingreso de muestra / bonificación',
  'Otro motivo',
];

export const ManualAdjustment: React.FC<ManualAdjustmentProps> = ({
  articles,
  movements,
  initialSelectedArticle,
  onApplyAdjustment,
}) => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState<number>(1);
  const [exactQuantity, setExactQuantity] = useState<number>(0);
  const [reason, setReason] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedArticle) {
      setSelectedArticleId(initialSelectedArticle.id);
      setExactQuantity(initialSelectedArticle.quantity);
    } else if (articles.length > 0 && !selectedArticleId) {
      setSelectedArticleId(articles[0].id);
      setExactQuantity(articles[0].quantity);
    }
  }, [initialSelectedArticle, articles]);

  const selectedArticle = useMemo(() => {
    return articles.find((a) => a.id === selectedArticleId);
  }, [articles, selectedArticleId]);

  useEffect(() => {
    if (selectedArticle) {
      setExactQuantity(selectedArticle.quantity);
    }
  }, [selectedArticleId]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  // Calculate live change and new stock
  const { quantityChange, newQuantity } = useMemo(() => {
    if (!selectedArticle) return { quantityChange: 0, newQuantity: 0 };
    const current = selectedArticle.quantity;

    if (adjustmentMode === 'add') {
      const delta = Math.max(1, amount);
      return { quantityChange: delta, newQuantity: current + delta };
    } else if (adjustmentMode === 'subtract') {
      const delta = Math.max(1, amount);
      const resulting = current - delta; // Allows negative inventory!
      return { quantityChange: -delta, newQuantity: resulting };
    } else {
      // 'set' exact quantity - allows negative stock count
      const exact = exactQuantity;
      return { quantityChange: exact - current, newQuantity: exact };
    }
  }, [selectedArticle, adjustmentMode, amount, exactQuantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    const finalReason = reason === 'Otro motivo' ? customReason.trim() || 'Ajuste manual' : reason;

    onApplyAdjustment({
      articleId: selectedArticle.id,
      quantityChange,
      newQuantity,
      reason: finalReason,
      notes: notes.trim() || undefined,
    });

    setSuccessMsg(
      `Stock actualizado para ${selectedArticle.code}: de ${selectedArticle.quantity} a ${newQuantity} ${selectedArticle.unit}.`
    );
    setNotes('');
    setAmount(1);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Filter recent manual adjustments
  const recentManualAdjustments = useMemo(() => {
    return movements
      .filter((m) => m.type === 'ajuste_manual')
      .slice(0, 5);
  }, [movements]);

  return (
    <div className="space-y-5">
      {/* Title banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Modificación Manual de Stock
            </h2>
            <p className="text-xs text-slate-400">
              Ajusta el inventario por recuentos físicos, mermas, mercadería dañada o correcciones directas.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Article Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              1. Seleccionar Artículo a Modificar
            </label>

            {/* Search filter for selection */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por código o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* List of articles */}
            <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
              {filteredArticles.map((art) => {
                const isSelected = art.id === selectedArticleId;
                return (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-300">
                          {art.code}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {art.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 truncate mt-0.5">
                        {art.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold font-mono text-white block">
                        {art.quantity} {art.unit}
                      </span>
                      <span className="text-[10px] text-slate-400">actual</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Adjustment Action Form */}
        <div className="lg:col-span-7">
          {selectedArticle ? (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              {/* Selected Article Banner */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedArticle.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedArticle.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-1">
                    {selectedArticle.description}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Ubicación: {selectedArticle.location || 'Sin asignar'}</span>
                    <span>Mínimo: {selectedArticle.minStock} {selectedArticle.unit}</span>
                  </div>
                </div>

                <div className="text-right bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Stock Actual
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {selectedArticle.quantity}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {selectedArticle.unit}
                    </span>
                  </span>
                </div>
              </div>

              {/* Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  2. Tipo de Operación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode('add')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      adjustmentMode === 'add'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Sumar (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentMode('subtract')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      adjustmentMode === 'subtract'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Restar (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentMode('set')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      adjustmentMode === 'set'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Recuento (=)</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input with Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {adjustmentMode === 'set'
                    ? 'Cantidad Exacta tras Recuento Físico'
                    : `Cantidad a ${adjustmentMode === 'add' ? 'Sumar' : 'Restar'}`}
                </label>

                {adjustmentMode === 'set' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      required
                      value={exactQuantity}
                      onChange={(e) => setExactQuantity(parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-2.5 bg-slate-800 border rounded-xl text-lg font-bold font-mono text-center focus:outline-hidden ${
                        exactQuantity < 0
                          ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                          : 'border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white font-mono text-center focus:outline-hidden focus:border-blue-500"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      {[1, 5, 10, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                            amount === preset
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Stock Diff Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Stock Anterior
                    </span>
                    <span className="text-sm font-bold text-slate-400 font-mono">
                      {selectedArticle.quantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        quantityChange > 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : quantityChange < 0
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {quantityChange > 0 ? `+${quantityChange}` : quantityChange}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] text-blue-400 uppercase font-bold block">
                      Nuevo Stock
                    </span>
                    <span
                      className={`text-lg font-extrabold font-mono ${
                        newQuantity < 0 ? 'text-purple-300' : 'text-white'
                      }`}
                    >
                      {newQuantity}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        {selectedArticle.unit}
                      </span>
                    </span>
                  </div>
                </div>

                {newQuantity < 0 && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between">
                    <span className="font-semibold">Saldo Negativo (Stock en descubierto)</span>
                    <span className="font-mono font-bold">{newQuantity} {selectedArticle.unit}</span>
                  </div>
                )}
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Motivo del Ajuste
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  {REASON_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {reason === 'Otro motivo' && (
                  <input
                    type="text"
                    required
                    placeholder="Especifica el motivo..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observaciones / Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Verificado por supervisor de turno tarde..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                id="btn-apply-manual-adjustment"
                type="submit"
                disabled={quantityChange === 0}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Modificación de Stock</span>
              </button>
            </form>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">Selecciona un artículo para realizar el ajuste manual.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Manual Adjustments */}
      {recentManualAdjustments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <span>Últimos Ajustes Manuales Registrados</span>
          </div>

          <div className="space-y-2">
            {recentManualAdjustments.map((mov) => (
              <div
                key={mov.id}
                className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-300">
                      {mov.articleCode}
                    </span>
                    <span className="text-slate-300 font-medium truncate max-w-xs">
                      {mov.articleDescription}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Motivo: <strong className="text-slate-200">{mov.reason || 'Ajuste manual'}</strong>{' '}
                    {mov.notes ? `(${mov.notes})` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      mov.quantityChange >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(mov.date).toLocaleDateString()} {new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
