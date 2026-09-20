import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  FileCheck,
  PackageCheck,
  Building,
  Calendar,
  Hash,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Article, ParsedPdfItem, ParsedPdfResult } from '../types';
import {
  getSampleInvoicePdf,
  getSampleDispatchPdf,
  getSampleLuxuryInvoicePdf,
} from '../services/samplePdfs';

interface PdfProcessorProps {
  articles: Article[];
  availableCategories?: string[];
  autoCreatedCategories?: string[];
  onConfirmCarga: (result: ParsedPdfResult) => void;
  onConfirmDescarga: (result: ParsedPdfResult) => void;
  onAddCategory?: (category: string) => void;
}

export const PdfProcessor: React.FC<PdfProcessorProps> = ({
  articles,
  availableCategories = [],
  autoCreatedCategories = [],
  onConfirmCarga,
  onConfirmDescarga,
  onAddCategory,
}) => {
  const [mode, setMode] = useState<'carga' | 'descarga'>('carga');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    base64: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedPdfResult | null>(null);

  // Bulk category assignment state
  const [bulkCategoryToApply, setBulkCategoryToApply] = useState('');
  const [isCreatingNewBulkCat, setIsCreatingNewBulkCat] = useState(false);
  const [newBulkCategoryInput, setNewBulkCategoryInput] = useState('');

  // Row inline category editing state
  const [editingCategoryRowIndex, setEditingCategoryRowIndex] = useState<number | null>(null);
  const [rowCustomCategory, setRowCustomCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // All categories selectable for items in this PDF
  const allSelectableCategories = useMemo(() => {
    const set = new Set<string>(availableCategories || []);
    articles.forEach((a) => {
      if (a.category?.trim()) set.add(a.category.trim());
    });
    if (parsedResult) {
      parsedResult.items.forEach((it) => {
        if (it.category?.trim()) set.add(it.category.trim());
      });
    }
    // Ensure commonly expected categories (like LUXURY, OUTLET) are readily selectable
    set.add('LUXURY');
    set.add('OUTLET');
    set.add('General');
    return Array.from(set).filter(Boolean).sort();
  }, [availableCategories, articles, parsedResult]);

  // Match items with existing inventory to calculate currentStock, isNew, hasInsufficientStock
  const enrichParsedItems = (
    rawItems: ParsedPdfItem[],
    currentMode: 'carga' | 'descarga'
  ): ParsedPdfItem[] => {
    return rawItems.map((item, idx) => {
      const cleanCode = (item.code || '').trim().toUpperCase();
      const matched = articles.find((a) => a.code.toUpperCase() === cleanCode);

      const quantity = Math.max(0, Number(item.quantity) || 0);
      const currentStock = matched ? matched.quantity : 0;
      const isNew = !matched;
      const hasInsufficientStock =
        currentMode === 'descarga' && (!matched || matched.quantity < quantity);

      // Preserve extracted category from PDF (e.g. LUXURY, OUTLET) or fallback to matched article's category or General
      const resolvedCategory =
        item.category && item.category !== 'General'
          ? item.category.trim()
          : matched?.category || item.category || 'General';

      return {
        ...item,
        id: item.id || `pdf-item-${idx}-${Date.now()}`,
        code: cleanCode,
        description: item.description || (matched ? matched.description : 'Artículo sin descripción'),
        category: resolvedCategory,
        quantity,
        matchedArticleId: matched?.id,
        isNew,
        currentStock,
        hasInsufficientStock,
      };
    });
  };

  const handleUpdateItemCategory = (index: number, newCategory: string) => {
    if (!parsedResult) return;
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const updated = [...parsedResult.items];
    updated[index] = {
      ...updated[index],
      category: trimmed,
    };
    setParsedResult({
      ...parsedResult,
      items: updated,
    });
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
  };

  const handleApplyCategoryToAll = (categoryName: string) => {
    if (!parsedResult) return;
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    const updated = parsedResult.items.map((it) => ({
      ...it,
      category: trimmed,
    }));
    setParsedResult({
      ...parsedResult,
      items: updated,
    });
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
  };

  const handleFileChange = (file: File) => {
    setError(null);
    setSuccessMessage(null);
    setParsedResult(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo en formato PDF válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        size: file.size,
        base64,
      });
    };
    reader.onerror = () => {
      setError('Error al leer el archivo PDF localmente.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (sampleType: 'carga' | 'descarga' | 'luxury_outlet') => {
    setError(null);
    setSuccessMessage(null);
    setParsedResult(null);

    if (sampleType === 'luxury_outlet') {
      setMode('carga');
      const sample = getSampleLuxuryInvoicePdf();
      setSelectedFile({
        name: sample.name,
        size: sample.blob.size,
        base64: sample.base64,
      });
      return;
    }

    setMode(sampleType);
    const sample =
      sampleType === 'carga' ? getSampleInvoicePdf() : getSampleDispatchPdf();

    setSelectedFile({
      name: sample.name,
      size: sample.blob.size,
      base64: sample.base64,
    });
  };

  const handleProcessPdf = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: selectedFile.base64,
          mode,
          filename: selectedFile.name,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        let errorMsg = result.error || 'Error del servidor al procesar el archivo PDF.';
        try {
          const parsed =
            typeof errorMsg === 'string' && errorMsg.trim().startsWith('{')
              ? JSON.parse(errorMsg)
              : null;
          if (parsed?.error?.message) {
            if (
              parsed.error.code === 503 ||
              parsed.error.status === 'UNAVAILABLE' ||
              parsed.error.message.includes('high demand')
            ) {
              errorMsg =
                'El servicio de Inteligencia Artificial está experimentando alta demanda momentánea. Pulsa "Reintentar ahora" para procesarlo nuevamente.';
            } else {
              errorMsg = parsed.error.message;
            }
          }
        } catch {
          // Keep errorMsg
        }
        throw new Error(errorMsg);
      }

      const enriched = enrichParsedItems(result.data.items || [], mode);
      setParsedResult({
        documentType: result.data.documentType || (mode === 'carga' ? 'Factura' : 'Remito'),
        documentNumber: result.data.documentNumber || 'S/N',
        documentDate: result.data.documentDate || new Date().toISOString().split('T')[0],
        partnerName: result.data.partnerName || (mode === 'carga' ? 'Proveedor' : 'Cliente'),
        notes: result.data.notes,
        items: enriched,
      });
    } catch (err: unknown) {
      console.error('Error al procesar PDF:', err);
      let msg = err instanceof Error ? err.message : 'Error al procesar el PDF.';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg =
          'El modelo de Inteligencia Artificial tiene alta demanda momentánea. Pulsa en "Reintentar ahora" en unos segundos.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartManualEntry = () => {
    setError(null);
    setSuccessMessage(null);
    setParsedResult({
      documentType: mode === 'carga' ? 'Factura / Comprobante' : 'Remito de Salida',
      documentNumber: 'DOC-' + Date.now().toString().slice(-4),
      documentDate: new Date().toISOString().split('T')[0],
      partnerName: mode === 'carga' ? 'Proveedor General' : 'Cliente General',
      notes: selectedFile ? `Archivo: ${selectedFile.name}` : 'Ingreso directo sin IA',
      items: [
        {
          id: `item-${Date.now()}-0`,
          code: '',
          description: '',
          quantity: 1,
          unit: 'u',
          unitPrice: 0,
          category: 'General',
          isNew: true,
          currentStock: 0,
          hasInsufficientStock: false,
        },
      ],
    });
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (!parsedResult) return;
    const updated = [...parsedResult.items];
    const qty = Math.max(0, newQty);
    const item = updated[index];
    const hasInsufficientStock =
      mode === 'descarga' && (item.currentStock ?? 0) < qty;

    updated[index] = {
      ...item,
      quantity: qty,
      hasInsufficientStock,
    };

    setParsedResult({
      ...parsedResult,
      items: updated,
    });
  };

  const handleUpdateItemCode = (index: number, newCode: string) => {
    if (!parsedResult) return;
    const cleanCode = newCode.trim().toUpperCase();
    const updated = [...parsedResult.items];
    const matched = articles.find((a) => a.code.toUpperCase() === cleanCode);

    updated[index] = {
      ...updated[index],
      code: cleanCode,
      matchedArticleId: matched?.id,
      isNew: !matched,
      currentStock: matched ? matched.quantity : 0,
      hasInsufficientStock:
        mode === 'descarga' && (!matched || matched.quantity < updated[index].quantity),
    };

    setParsedResult({
      ...parsedResult,
      items: updated,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedResult) return;
    const updated = parsedResult.items.filter((_, i) => i !== index);
    setParsedResult({
      ...parsedResult,
      items: updated,
    });
  };

  const handleConfirmAction = () => {
    if (!parsedResult || parsedResult.items.length === 0) return;

    if (mode === 'descarga') {
      const negativeCount = parsedResult.items.filter((it) => {
        const current = it.currentStock ?? 0;
        return current - it.quantity < 0;
      }).length;

      onConfirmDescarga(parsedResult);
      setSuccessMessage(
        `¡Descarga de stock completada! Se descontaron los artículos indicados en ${parsedResult.documentType} ${parsedResult.documentNumber || ''}.${
          negativeCount > 0 ? ` (${negativeCount} artículo(s) pasaron a saldo negativo).` : ''
        }`
      );
    } else {
      onConfirmCarga(parsedResult);
      setSuccessMessage(
        `¡Carga de stock completada! Se ingresaron los artículos de ${parsedResult.documentType} ${parsedResult.documentNumber || ''} al inventario.`
      );
    }

    setParsedResult(null);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-5">
      {/* Mode Switcher: Carga vs Descarga */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex gap-2">
        <button
          id="btn-mode-carga"
          onClick={() => {
            setMode('carga');
            setParsedResult(null);
            setError(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            mode === 'carga'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>CARGA de Stock (Entrada)</span>
        </button>

        <button
          id="btn-mode-descarga"
          onClick={() => {
            setMode('descarga');
            setParsedResult(null);
            setError(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            mode === 'descarga'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>DESCARGA de Stock (Salida)</span>
        </button>
      </div>

      {/* Mode explainer banner */}
      <div
        className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
          mode === 'carga'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-200'
        }`}
      >
        {mode === 'carga' ? (
          <ArrowDownToLine className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <ArrowUpFromLine className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        )}
        <div>
          <strong className="font-semibold block text-white mb-0.5">
            {mode === 'carga'
              ? 'Carga de Stock mediante PDF (Ingreso de Mercadería)'
              : 'Descarga de Stock mediante PDF (Egreso de Mercadería)'}
          </strong>
          <span>
            {mode === 'carga'
              ? 'Sube facturas de compra, remitos de proveedor o listas de albarán. Gemini extraerá automáticamente los códigos, descripciones y cantidades para sumar al stock existente o dar de alta nuevos productos.'
              : 'Sube remitos de despacho, facturas de venta u órdenes de entrega. Gemini extraerá los códigos y cantidades para descontar del stock actual con control de disponibilidad.'}
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Aviso sobre el procesamiento del PDF</p>
              <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
            {selectedFile && (
              <button
                id="btn-retry-process-pdf"
                onClick={handleProcessPdf}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reintentar ahora</span>
              </button>
            )}
            <button
              id="btn-manual-entry-fallback"
              onClick={handleStartManualEntry}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Cargar datos manualmente
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone / Drag & Drop */}
      {!parsedResult && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-slate-900/60 ${
              selectedFile
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Archivo PDF listo para analizar
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    Cambiar archivo
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    Arrastra tu archivo PDF aquí o haz clic para seleccionarlo
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Soporta cualquier factura, remito o comprobante en PDF
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
                >
                  Seleccionar archivo PDF
                </button>
              </div>
            )}
          </div>

          {/* Quick test sample buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
            <div className="text-slate-400 text-center sm:text-left">
              ¿No tienes un PDF a mano? Prueba con un documento de muestra generado en tiempo real:
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
              <button
                onClick={() => handleLoadSample('carga')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition font-medium flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Factura Proveedor</span>
              </button>

              <button
                onClick={() => handleLoadSample('luxury_outlet')}
                className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition font-medium flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Factura Luxury / Outlet</span>
              </button>

              <button
                onClick={() => handleLoadSample('descarga')}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition font-medium flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Remito Despacho</span>
              </button>
            </div>
          </div>

          {/* Action button to execute Gemini parsing */}
          {selectedFile && (
            <button
              id="btn-process-pdf-gemini"
              onClick={handleProcessPdf}
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Leyendo y analizando PDF con Gemini AI...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>
                    Analizar PDF para {mode === 'carga' ? 'Carga de Stock' : 'Descarga de Stock'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Optional manual entry fallback */}
          <div className="text-center pt-1">
            <button
              id="btn-direct-manual-table"
              onClick={handleStartManualEntry}
              className="text-xs text-slate-400 hover:text-slate-200 underline decoration-slate-600 transition"
            >
              ¿Prefieres ingresar los artículos de la planilla manualmente? Haz clic aquí
            </button>
          </div>
        </div>
      )}

      {/* Extracted & Parsed Review Table */}
      {parsedResult && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          {/* Document metadata summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-md ${
                    mode === 'carga'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {mode === 'carga' ? 'Carga de Stock' : 'Descarga de Stock'}
                </span>
                <h3 className="text-base font-bold text-white">
                  {parsedResult.documentType}{' '}
                  {parsedResult.documentNumber ? `N° ${parsedResult.documentNumber}` : ''}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Revisa los artículos y cantidades extraídas antes de aplicar los cambios en el inventario.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setParsedResult(null)}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Volver a subir
              </button>
            </div>
          </div>

          {/* Quick info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px] uppercase">
                  {mode === 'carga' ? 'Proveedor' : 'Cliente'}
                </span>
                <span className="font-semibold text-slate-200">
                  {parsedResult.partnerName || 'No especificado'}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Fecha</span>
                <span className="font-semibold text-slate-200">
                  {parsedResult.documentDate || 'Hoy'}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Artículos Leídos</span>
                <span className="font-bold text-white">
                  {parsedResult.items.length} productos (
                  {parsedResult.items.reduce((sum, i) => sum + i.quantity, 0)} u total)
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Category Assignment Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                Categoría para productos del documento:
              </span>
              <span className="text-slate-400 text-[11px] hidden md:inline">
                (Puedes aplicar una categoría como LUXURY u OUTLET a todos los ítems)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isCreatingNewBulkCat ? (
                <>
                  <select
                    id="select-bulk-category-pdf"
                    value={bulkCategoryToApply}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCreatingNewBulkCat(true);
                      } else {
                        setBulkCategoryToApply(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  >
                    <option value="">Seleccionar categoría para todos...</option>
                    {allSelectableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__NEW__">+ Nueva categoría...</option>
                  </select>

                  <button
                    type="button"
                    id="btn-apply-category-to-all"
                    onClick={() => {
                      if (bulkCategoryToApply) {
                        handleApplyCategoryToAll(bulkCategoryToApply);
                      }
                    }}
                    disabled={!bulkCategoryToApply}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs transition active:scale-95"
                  >
                    Asignar a todos
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreatingNewBulkCat(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
                  >
                    + Nueva
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: LUXURY, OUTLET..."
                    value={newBulkCategoryInput}
                    onChange={(e) => setNewBulkCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newBulkCategoryInput.trim()) {
                          const val = newBulkCategoryInput.trim();
                          handleApplyCategoryToAll(val);
                          setBulkCategoryToApply(val);
                          setNewBulkCategoryInput('');
                          setIsCreatingNewBulkCat(false);
                        }
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-800 border border-blue-500 rounded-lg text-xs text-white w-44 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBulkCategoryInput.trim()) {
                        const val = newBulkCategoryInput.trim();
                        handleApplyCategoryToAll(val);
                        setBulkCategoryToApply(val);
                        setNewBulkCategoryInput('');
                        setIsCreatingNewBulkCat(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Crear y Asignar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewBulkCat(false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Items review table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Stock Actual</th>
                  <th className="py-2.5 px-3 text-center">
                    {mode === 'carga' ? 'A Ingresar (+)' : 'A Descargar (-)'}
                  </th>
                  <th className="py-2.5 px-3 text-center">Resultado</th>
                  <th className="py-2.5 px-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {parsedResult.items.map((item, index) => {
                  const current = item.currentStock ?? 0;
                  const resultingStock =
                    mode === 'carga'
                      ? current + item.quantity
                      : current - item.quantity;
                  const isNegativeResult = mode === 'descarga' && resultingStock < 0;

                  return (
                    <tr
                      key={item.id || index}
                      className={`hover:bg-slate-800/40 transition ${
                        isNegativeResult
                          ? 'bg-purple-950/20'
                          : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleUpdateItemCode(index, e.target.value)}
                          className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-blue-300 uppercase text-xs focus:outline-hidden focus:border-blue-500"
                        />
                        {item.isNew && (
                          <span className="block text-[10px] text-emerald-400 mt-0.5">
                            * Se creará nuevo
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-200 block max-w-xs truncate">
                          {item.description}
                        </span>
                        {item.unit && (
                          <span className="text-[10px] text-slate-400">
                            Unidad: {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        {editingCategoryRowIndex === index ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Ej: LUXURY"
                              value={rowCustomCategory}
                              onChange={(e) => setRowCustomCategory(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (rowCustomCategory.trim()) {
                                    handleUpdateItemCategory(index, rowCustomCategory.trim());
                                    setEditingCategoryRowIndex(null);
                                    setRowCustomCategory('');
                                  }
                                }
                              }}
                              className="w-28 px-2 py-1 bg-slate-800 border border-blue-500 rounded text-xs text-white uppercase focus:outline-hidden font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (rowCustomCategory.trim()) {
                                  handleUpdateItemCategory(index, rowCustomCategory.trim());
                                  setEditingCategoryRowIndex(null);
                                  setRowCustomCategory('');
                                }
                              }}
                              className="px-1.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryRowIndex(null)}
                              className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <select
                              value={item.category || 'General'}
                              onChange={(e) => {
                                if (e.target.value === '__NEW__') {
                                  setEditingCategoryRowIndex(index);
                                  setRowCustomCategory('');
                                } else {
                                  handleUpdateItemCategory(index, e.target.value);
                                }
                              }}
                              className={`w-28 sm:w-32 px-2 py-1 bg-slate-800 border rounded font-medium text-xs focus:outline-hidden focus:border-blue-500 ${
                                item.category === 'LUXURY'
                                  ? 'border-purple-500/50 text-purple-200'
                                  : item.category === 'OUTLET'
                                  ? 'border-amber-500/50 text-amber-200'
                                  : 'border-slate-700 text-slate-200'
                              }`}
                            >
                              {allSelectableCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                              <option value="__NEW__">+ Otra categoría...</option>
                            </select>
                            <button
                              type="button"
                              title="Escribir categoría directamente"
                              onClick={() => {
                                setEditingCategoryRowIndex(index);
                                setRowCustomCategory(item.category || '');
                              }}
                              className="p-1 text-slate-400 hover:text-blue-400 transition"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                        {item.isNew ? (
                          <span className="text-slate-500 italic">0 (Nuevo)</span>
                        ) : (
                          <span className={`font-bold ${current < 0 ? 'text-purple-300' : ''}`}>
                            {current}
                          </span>
                        )}
                      </td>

                      {/* Quantity from PDF (Editable) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 0}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQuantity(index, parseInt(e.target.value) || 0)
                            }
                            className={`w-16 px-2 py-1 text-center font-bold font-mono rounded border ${
                              mode === 'carga'
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : isNegativeResult
                                ? 'bg-purple-950/50 border-purple-500/50 text-purple-200'
                                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                            }`}
                          />
                          <button
                            onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Resulting Stock */}
                      <td className="py-2.5 px-3 text-center">
                        {isNegativeResult ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-purple-500/20 text-purple-200 border border-purple-500/40 inline-flex items-center justify-center gap-1">
                            <span className="text-[10px] uppercase font-sans tracking-wide text-purple-300">Descubierto</span>
                            <span>{resultingStock}</span>
                          </span>
                        ) : resultingStock === 0 ? (
                          <span className="font-bold text-amber-300 font-mono text-xs">
                            0 (Agotado)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-100 font-mono">
                            {resultingStock}
                          </span>
                        )}
                      </td>

                      {/* Remove item row */}
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                          title="Eliminar esta línea del lote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Total a {mode === 'carga' ? 'ingresar' : 'descontar'}:{' '}
              <strong className="text-white">
                {parsedResult.items.reduce((s, i) => s + i.quantity, 0)} unidades
              </strong>{' '}
              en {parsedResult.items.length} artículos.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setParsedResult(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-pdf-stock"
                onClick={handleConfirmAction}
                disabled={parsedResult.items.length === 0}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
                  mode === 'carga'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {mode === 'carga'
                    ? 'Confirmar e Ingresar Stock'
                    : 'Confirmar y Descargar Stock'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
