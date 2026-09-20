import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  Edit2,
  Trash2,
  MapPin,
  Tag,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  PackageX,
  Filter,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import { Article } from '../types';

interface ArticlesListProps {
  articles: Article[];
  availableCategories: string[];
  autoCreatedCategories?: string[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenCategoryManager?: () => void;
  onAddCategory?: (category: string) => void;
  onAddArticle: () => void;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (articleId: string) => void;
  onQuickAdjust: (article: Article, delta: number) => void;
  onOpenManualAdjust: (article: Article) => void;
}

export const ArticlesList: React.FC<ArticlesListProps> = ({
  articles,
  availableCategories,
  autoCreatedCategories = [],
  selectedCategory: externalSelectedCategory,
  onSelectCategory: externalOnSelectCategory,
  onOpenCategoryManager,
  onAddCategory,
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
  onQuickAdjust,
  onOpenManualAdjust,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalCategory, setInternalCategory] = useState('all');

  const selectedCategory = externalSelectedCategory !== undefined ? externalSelectedCategory : internalCategory;
  const setSelectedCategory = (cat: string) => {
    if (externalOnSelectCategory) {
      externalOnSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const [stockFilter, setStockFilter] = useState<'all' | 'negative' | 'low' | 'out' | 'normal'>('all');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>(availableCategories || []);
    articles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [articles, availableCategories]);

  const autoCategoriesCount = useMemo(() => {
    return categories.filter((c) => autoCreatedCategories.includes(c)).length;
  }, [categories, autoCreatedCategories]);

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const negativeArticlesCount = useMemo(
    () => articles.filter((a) => a.quantity < 0).length,
    [articles]
  );
  const lowStockArticlesCount = useMemo(
    () => articles.filter((a) => a.quantity > 0 && a.quantity <= a.minStock).length,
    [articles]
  );
  const outOfStockArticlesCount = useMemo(
    () => articles.filter((a) => a.quantity === 0).length,
    [articles]
  );

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchSearch =
        article.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.location && article.location.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchCategory = true;
      if (selectedCategory === '__auto__') {
        matchCategory = autoCreatedCategories.includes(article.category);
      } else if (selectedCategory !== 'all') {
        matchCategory = article.category === selectedCategory;
      }

      let matchStock = true;
      if (stockFilter === 'negative') {
        matchStock = article.quantity < 0;
      } else if (stockFilter === 'low') {
        matchStock = article.quantity > 0 && article.quantity <= article.minStock;
      } else if (stockFilter === 'out') {
        matchStock = article.quantity === 0;
      } else if (stockFilter === 'normal') {
        matchStock = article.quantity > article.minStock;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [articles, searchTerm, selectedCategory, stockFilter, autoCreatedCategories]);

  return (
    <div className="space-y-4">
      {/* Top action bar: Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search by code or description */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-articles-input"
            type="text"
            placeholder="Buscar por código (SKU), descripción o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Top Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenCategoryManager && (
            <button
              id="btn-open-category-manager-top"
              onClick={onOpenCategoryManager}
              title="Abrir panel de gestión de categorías (ver, crear y eliminar)"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-sm font-semibold transition active:scale-95 shrink-0"
            >
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Gestionar Categorías</span>
              <span className="sm:hidden">Categorías</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-900 font-mono text-slate-300">
                {categories.length}
              </span>
              {autoCategoriesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400" title="Hay categorías creadas desde PDF" />
              )}
            </button>
          )}

          {/* Add article button */}
          <button
            id="btn-add-article"
            onClick={onAddArticle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Artículo</span>
          </button>
        </div>
      </div>

      {/* Filter pills: Categories & Stock status */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Stock status pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 pl-1">
            <Filter className="w-3 h-3" /> Estado:
          </span>
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              stockFilter === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todos ({articles.length})
          </button>
          {negativeArticlesCount > 0 && (
            <button
              onClick={() => setStockFilter('negative')}
              className={`px-3 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 ${
                stockFilter === 'negative'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/60'
                  : 'bg-slate-900/80 text-purple-300/80 hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Stock Negativo ({negativeArticlesCount})
            </button>
          )}
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 ${
              stockFilter === 'low'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Stock Bajo ({lowStockArticlesCount})
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 ${
              stockFilter === 'out'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Agotados ({outOfStockArticlesCount})
          </button>
          <button
            onClick={() => setStockFilter('normal')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 ${
              stockFilter === 'normal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Stock Normal
          </button>
        </div>

        {/* Category Header & Pinned Manager Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Categorías</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {categories.length}
            </span>
          </div>

          {onOpenCategoryManager && (
            <button
              onClick={onOpenCategoryManager}
              id="btn-open-category-manager-filter"
              title="Administrar todas las categorías y eliminar las no deseadas"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shrink-0 flex items-center gap-1.5 text-xs font-semibold"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
              <span>Gestionar Categorías ({categories.length})</span>
              {autoCategoriesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400" title="Hay categorías auto-creadas" />
              )}
            </button>
          )}
        </div>

        {/* Category pills with quick category creation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todas ({articles.length})
          </button>

          {/* Quick filter for auto-created categories */}
          {autoCategoriesCount > 0 && (
            <button
              onClick={() => setSelectedCategory(selectedCategory === '__auto__' ? 'all' : '__auto__')}
              title="Filtrar artículos pertenecientes a categorías creadas automáticamente al cargar productos"
              className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 font-semibold ${
                selectedCategory === '__auto__'
                  ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-xs'
                  : 'bg-slate-900/80 text-purple-300/90 border border-purple-500/20 hover:bg-purple-950/30'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Auto-creadas ({autoCategoriesCount})</span>
            </button>
          )}

          {categories.map((cat) => {
            const isAuto = autoCreatedCategories.includes(cat);
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold'
                    : isAuto
                    ? 'bg-slate-900/70 text-slate-300 border border-purple-500/25 hover:bg-slate-800'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
                title={isAuto ? `Categoría auto-creada desde producto importado` : undefined}
              >
                {isAuto && <Sparkles className="w-2.5 h-2.5 text-purple-400" />}
                <span>{cat}</span>
              </button>
            );
          })}

          {/* Inline create category button or input */}
          {isAddingCategory ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Nueva categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                className="px-2 py-0.5 bg-slate-800 border border-blue-500 rounded-md text-xs text-white focus:outline-hidden w-36"
              />
              <button
                onClick={handleCreateCategory}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition"
              >
                +
              </button>
              <button
                onClick={() => setIsAddingCategory(false)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md text-xs transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-blue-400 hover:text-blue-300 border border-dashed border-slate-700 hover:border-blue-500/50 transition shrink-0 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Nueva Categoría</span>
            </button>
          )}

          {/* Manage Categories Button */}
          {onOpenCategoryManager && (
            <button
              onClick={onOpenCategoryManager}
              id="btn-open-category-manager"
              title="Administrar todas las categorías y eliminar las no deseadas"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shrink-0 flex items-center gap-1.5 font-medium ml-auto"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
              <span>Gestionar ({categories.length})</span>
              {autoCategoriesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400" title="Hay categorías auto-creadas" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <PackageX className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            No se encontraron artículos
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all'
              ? 'Prueba modificando los filtros de búsqueda o categoría.'
              : 'Aún no tienes artículos registrados. Haz clic en "Nuevo Artículo" o importa un PDF.'}
          </p>
          {(searchTerm || selectedCategory !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredArticles.map((article) => {
            const isNegative = article.quantity < 0;
            const isOutOfStock = article.quantity === 0;
            const isLowStock = !isNegative && !isOutOfStock && article.quantity <= article.minStock;

            return (
              <div
                key={article.id}
                id={`article-card-${article.code}`}
                className={`relative flex flex-col justify-between bg-slate-900 border rounded-2xl p-4 transition-all hover:border-slate-700 shadow-sm ${
                  isNegative
                    ? 'border-purple-500/50 bg-purple-950/20'
                    : isOutOfStock
                    ? 'border-rose-900/40 bg-slate-900/90'
                    : isLowStock
                    ? 'border-amber-900/40 bg-slate-900/90'
                    : 'border-slate-800/80'
                }`}
              >
                {/* Header: Code badge & Actions */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {article.code}
                      </span>
                      {article.category && (
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md flex items-center gap-1 ${
                            autoCreatedCategories.includes(article.category)
                              ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                          title={
                            autoCreatedCategories.includes(article.category)
                              ? 'Categoría generada automáticamente desde producto importado'
                              : undefined
                          }
                        >
                          {autoCreatedCategories.includes(article.category) && (
                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          )}
                          <span>{article.category}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Editar datos del artículo"
                        onClick={() => onEditArticle(article)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Eliminar artículo"
                        onClick={() => onDeleteArticle(article.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <h4 className="text-sm font-semibold text-white mt-2.5 line-clamp-2 leading-snug">
                    {article.description}
                  </h4>

                  {/* Location & Min Stock metadata */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate max-w-[140px]">
                        {article.location || 'Sin ubicación'}
                      </span>
                    </div>
                    <span>Mínimo: {article.minStock} {article.unit}</span>
                  </div>
                </div>

                {/* Bottom section: Stock present badge and quick +/- actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-2">
                    {/* Stock Presente Badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                          isNegative
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                            : isOutOfStock
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : isLowStock
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                            {isNegative ? 'Descubierto' : 'Presente'}
                          </span>
                          <span className="text-base font-extrabold leading-none font-mono">
                            {article.quantity}{' '}
                            <span className="text-xs font-normal opacity-90">
                              {article.unit}
                            </span>
                          </span>
                        </div>
                      </div>

                      {isLowStock && (
                        <span
                          title="Stock bajo el mínimo requerido"
                          className="flex items-center text-amber-400 text-xs font-medium"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      )}
                      {isNegative && (
                        <span
                          title="Stock en negativo / faltante pendiente de ingreso"
                          className="flex items-center text-purple-400 text-xs font-medium"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    {/* Quick inline controls: +1, -1 and Manual Adjust */}
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Restar 1 unidad (permite stock negativo)"
                        onClick={() => onQuickAdjust(article, -1)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95"
                      >
                        <MinusCircle className="w-4 h-4 text-rose-400" />
                      </button>

                      <button
                        title="Sumar 1 unidad"
                        onClick={() => onQuickAdjust(article, 1)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                      </button>

                      <button
                        title="Modificar stock manualmente"
                        onClick={() => onOpenManualAdjust(article)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 text-xs font-medium border border-slate-700/60 transition"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Ajustar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
