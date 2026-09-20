import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  Package,
  Search,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Article } from '../types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  autoCreatedCategories: string[];
  articles: Article[];
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string, reassignTo?: string) => void;
  onFilterByCategory: (categoryName: string) => void;
  onCleanUnusedCategories?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  autoCreatedCategories,
  articles,
  onAddCategory,
  onDeleteCategory,
  onFilterByCategory,
  onCleanUnusedCategories,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'auto' | 'empty'>('all');
  const [newCatName, setNewCatName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignCategory, setReassignCategory] = useState<string>('General');

  // Count articles per category
  const articleCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat] = 0;
    });
    articles.forEach((art) => {
      const cat = art.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [categories, articles]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch = cat.toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;

      const isAuto = autoCreatedCategories.includes(cat);
      const count = articleCountByCategory[cat] || 0;

      if (filterMode === 'auto') return isAuto;
      if (filterMode === 'empty') return count === 0;
      return true;
    });
  }, [categories, searchTerm, filterMode, autoCreatedCategories, articleCountByCategory]);

  const autoCategoriesCount = useMemo(() => {
    return categories.filter((c) => autoCreatedCategories.includes(c)).length;
  }, [categories, autoCreatedCategories]);

  const emptyCategoriesCount = useMemo(() => {
    return categories.filter((c) => (articleCountByCategory[c] || 0) === 0).length;
  }, [categories, articleCountByCategory]);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCatName('');
  };

  const startDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat);
    // Suggest a default reassign target that is not the one being deleted
    const alternative = categories.find((c) => c !== cat) || 'General';
    setReassignCategory(alternative);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const count = articleCountByCategory[categoryToDelete] || 0;
    const targetReassign = count > 0 ? reassignCategory : undefined;
    onDeleteCategory(categoryToDelete, targetReassign);
    setCategoryToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs">
      <div
        id="category-manager-modal"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Gestión de Categorías</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {categories.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualiza, añade y elimina categorías, incluidas las creadas automáticamente desde productos no listados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:px-5 bg-slate-950/40 border-b border-slate-800/80 text-xs shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Total Categorías</span>
            <span className="text-base font-bold text-white font-mono">{categories.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
            <span className="text-purple-300 block text-[11px] flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-purple-400" /> Auto-creadas
            </span>
            <span className="text-base font-bold text-purple-200 font-mono">{autoCategoriesCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Artículos Clasificados</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{articles.length}</span>
          </div>
        </div>

        {/* Create new category row */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <form onSubmit={handleCreateSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                id="input-create-category-modal"
                placeholder="Crear nueva categoría manual..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear</span>
            </button>
          </form>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-950/20 shrink-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium shrink-0 ${
                filterMode === 'all'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({categories.length})
            </button>
            <button
              onClick={() => setFilterMode('auto')}
              className={`px-2.5 py-1 rounded-lg transition font-medium shrink-0 flex items-center gap-1 ${
                filterMode === 'auto'
                  ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50'
                  : 'bg-slate-800 text-purple-300/80 hover:text-purple-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              Auto-creadas ({autoCategoriesCount})
            </button>
            <button
              onClick={() => setFilterMode('empty')}
              className={`px-2.5 py-1 rounded-lg transition font-medium shrink-0 ${
                filterMode === 'empty'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Sin Artículos ({emptyCategoriesCount})
            </button>

            {emptyCategoriesCount > 0 && onCleanUnusedCategories && (
              <button
                onClick={onCleanUnusedCategories}
                id="btn-clean-unused-categories"
                title="Eliminar todas las categorías sin artículos asignados"
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition font-semibold shrink-0 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Borrar vacías ({emptyCategoriesCount})</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-slate-800/50">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10">
              <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No se encontraron categorías</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchTerm
                  ? 'Intenta con otro término de búsqueda'
                  : 'Crea una nueva categoría o carga productos para generarlas automáticamente.'}
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isAuto = autoCreatedCategories.includes(cat);
              const articleCount = articleCountByCategory[cat] || 0;

              return (
                <div
                  key={cat}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isAuto
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {isAuto ? <Sparkles className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{cat}</span>
                        {isAuto && (
                          <span
                            title="Categoría creada automáticamente al ingresar o descargar un producto no registrado en el inventario"
                            className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30 flex items-center gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                            <span>Auto-creada desde producto</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Package className="w-3 h-3 text-slate-500" />
                        <span>
                          {articleCount === 0
                            ? 'Sin artículos asignados'
                            : `${articleCount} ${articleCount === 1 ? 'artículo' : 'artículos'}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* View articles in this category */}
                    <button
                      onClick={() => {
                        onFilterByCategory(cat);
                        onClose();
                      }}
                      title={`Ver los ${articleCount} artículos en "${cat}"`}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 transition"
                    >
                      <span>Ver artículos</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Delete Category button */}
                    <button
                      onClick={() => startDeleteCategory(cat)}
                      title={`Eliminar categoría "${cat}"`}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30 transition"
                      aria-label={`Eliminar ${cat}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Overlay inside modal */}
        {categoryToDelete && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-xs p-5 rounded-2xl flex flex-col justify-center animate-in fade-in duration-100">
            <div className="max-w-md mx-auto w-full space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    ¿Eliminar la categoría "{categoryToDelete}"?
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {(articleCountByCategory[categoryToDelete] || 0) > 0 ? (
                      <>
                        Esta categoría tiene{' '}
                        <strong className="text-white">
                          {articleCountByCategory[categoryToDelete]} artículos
                        </strong>{' '}
                        asignados. Selecciona a qué categoría deseas transferirlos:
                      </>
                    ) : (
                      'Esta categoría no tiene artículos asociados y se eliminará permanentemente.'
                    )}
                  </p>
                </div>
              </div>

              {/* Reassignment target if articles exist */}
              {(articleCountByCategory[categoryToDelete] || 0) > 0 && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Reasignar artículos a:
                  </label>
                  <select
                    value={reassignCategory}
                    onChange={(e) => setReassignCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {categories
                      .filter((c) => c !== categoryToDelete)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-category"
                  onClick={confirmDeleteCategory}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Eliminación</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 rounded-b-2xl flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Las categorías detectadas en remitos o facturas se agregan solas.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
