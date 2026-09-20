import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Barcode,
  Tag,
  MapPin,
  DollarSign,
  Plus,
  Trash2,
} from 'lucide-react';
import { Article } from '../types';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Article) => void;
  existingArticle?: Article | null;
  allArticles: Article[];
  availableCategories: string[];
  onAddCategory?: (category: string) => void;
  onDeleteArticle?: (articleId: string) => void;
}

const UNIT_PRESETS = ['u', 'caja', 'rollo', 'kg', 'mts', 'par', 'litros', 'pack'];

export const ArticleModal: React.FC<ArticleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingArticle,
  allArticles,
  availableCategories,
  onAddCategory,
  onDeleteArticle,
}) => {
  const isEditing = Boolean(existingArticle);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState('u');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Dynamic category list derived from actual available categories and existing article
  const allCategoriesList: string[] = useMemo(() => {
    const set = new Set<string>();
    if (availableCategories && availableCategories.length > 0) {
      availableCategories.forEach((c) => {
        if (c && c.trim()) set.add(c.trim());
      });
    }
    if (existingArticle?.category?.trim()) {
      set.add(existingArticle.category.trim());
    }
    const list = Array.from(set).sort();
    return list.length > 0 ? list : ['General'];
  }, [availableCategories, existingArticle]);

  useEffect(() => {
    if (existingArticle) {
      setCode(existingArticle.code);
      setDescription(existingArticle.description);
      setCategory(existingArticle.category || 'General');
      setQuantity(existingArticle.quantity ?? 0);
      setMinStock(existingArticle.minStock ?? 5);
      setUnit(existingArticle.unit || 'u');
      setLocation(existingArticle.location || '');
      setPrice(existingArticle.price);
    } else {
      setCode('');
      setDescription('');
      setCategory(availableCategories?.[0] || 'General');
      setQuantity(0);
      setMinStock(5);
      setUnit('u');
      setLocation('');
      setPrice(undefined);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setError(null);
  }, [existingArticle, isOpen, availableCategories]);

  if (!isOpen) return null;

  const handleCreateCategorySubmit = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
    setCategory(trimmed);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanDesc = description.trim();

    if (!cleanCode) {
      setError('El código de artículo es obligatorio.');
      return;
    }

    if (!cleanDesc) {
      setError('La descripción del artículo es obligatoria.');
      return;
    }

    // Check code uniqueness if creating new or changing code
    const duplicate = allArticles.find(
      (a) => a.code.toUpperCase() === cleanCode && a.id !== existingArticle?.id
    );

    if (duplicate) {
      setError(`Ya existe un artículo con el código "${cleanCode}" (${duplicate.description}).`);
      return;
    }

    const articleToSave: Article = {
      id: existingArticle ? existingArticle.id : `art-${Date.now()}`,
      code: cleanCode,
      description: cleanDesc,
      category: category.trim() || 'General',
      quantity: Number(quantity) || 0, // Allows negative stock!
      minStock: Math.max(0, Number(minStock) || 0),
      unit: unit.trim() || 'u',
      location: location.trim() || undefined,
      price: price !== undefined && !isNaN(price) ? Number(price) : undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(articleToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isEditing ? 'Editar Artículo' : 'Cargar Nuevo Artículo'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `Código: ${existingArticle?.code}` : 'Ingresa el código, descripción y cantidades'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Code */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Código / SKU / Ref <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: TAL-20V-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Category with inline new creator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Categoría
                </label>
                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Nueva</span>
                  </button>
                )}
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nombre categoría..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategorySubmit();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-blue-500/60 rounded-lg text-xs text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategorySubmit}
                    className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                >
                  {allCategoriesList.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__NEW__">+ Crear nueva categoría...</option>
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descripción del Artículo <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="Ej: Taladro Percutor Inalámbrico 20V Mandril 13mm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Quantities and Unit - allows negative stock */}
          <div className="grid grid-cols-3 gap-3">
            {/* Quantity present */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Stock Presente <span className="text-rose-400">*</span>
                </label>
              </div>
              <input
                type="number"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 bg-slate-800/90 border rounded-lg text-sm font-bold text-center focus:outline-hidden transition ${
                  quantity < 0
                    ? 'border-purple-500/60 text-purple-300 bg-purple-950/30'
                    : 'border-slate-700 text-white focus:border-blue-500'
                }`}
              />
              {quantity < 0 && (
                <span className="block text-[10px] text-purple-400 text-center mt-0.5 font-semibold">
                  Saldo en descubierto
                </span>
              )}
            </div>

            {/* Minimum stock */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white text-center focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Unidad
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
              >
                {UNIT_PRESETS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location and Reference Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ubicación en Almacén
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Ej: Estantería B-04 / Pasillo 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Precio Referencia ($)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price !== undefined ? price : ''}
                  onChange={(e) =>
                    setPrice(e.target.value === '' ? undefined : parseFloat(e.target.value))
                  }
                  className="w-full pl-8 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Actions: Save, Cancel, and Delete if editing */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2.5">
            <div>
              {isEditing && existingArticle && onDeleteArticle && (
                <button
                  type="button"
                  id="btn-delete-article-from-modal"
                  onClick={() => {
                    onDeleteArticle(existingArticle.id);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar artículo</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-save-article"
                className="px-5 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                {isEditing ? 'Guardar Cambios' : 'Cargar Artículo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
