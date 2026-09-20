/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ArticlesList } from './components/ArticlesList';
import { ArticleModal } from './components/ArticleModal';
import { PdfProcessor } from './components/PdfProcessor';
import { ManualAdjustment } from './components/ManualAdjustment';
import { MovementsLog } from './components/MovementsLog';
import { ApkInstallModal } from './components/ApkInstallModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { Article, StockMovement, ActiveTab, ParsedPdfResult } from './types';
import {
  getStoredArticles,
  saveStoredArticles,
  getStoredMovements,
  saveStoredMovements,
  getStoredCategories,
  saveStoredCategories,
  getStoredAutoCategories,
  saveStoredAutoCategories,
} from './services/storage';
import { usePWAInstall } from './hooks/usePWAInstall';
import { WifiOff, CheckCircle } from 'lucide-react';

export default function App() {
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles());
  const [movements, setMovements] = useState<StockMovement[]>(() => getStoredMovements());
  const [activeTab, setActiveTab] = useState<ActiveTab>('articulos');

  // Categories state with persistence
  const [categories, setCategories] = useState<string[]>(() => getStoredCategories());
  const [autoCreatedCategories, setAutoCreatedCategories] = useState<string[]>(() =>
    getStoredAutoCategories()
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    saveStoredCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveStoredAutoCategories(autoCreatedCategories);
  }, [autoCreatedCategories]);

  // Helper to ensure new categories are added and tracked
  const ensureCategoriesRegistered = (
    newCategoryList: (string | undefined)[],
    isAuto: boolean = true
  ) => {
    const toAdd: string[] = [];
    newCategoryList.forEach((raw) => {
      const trimmed = raw?.trim();
      if (!trimmed) return;
      if (!categories.includes(trimmed) && !toAdd.includes(trimmed)) {
        toAdd.push(trimmed);
      }
    });

    if (toAdd.length > 0) {
      setCategories((prev) => [...prev, ...toAdd]);
      if (isAuto) {
        setAutoCreatedCategories((prev) =>
          Array.from(new Set([...prev, ...toAdd]))
        );
      }
    }
    return toAdd;
  };

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    ensureCategoriesRegistered([trimmed], false);
    showToast(`Categoría "${trimmed}" agregada.`);
  };

  const handleDeleteCategory = (
    categoryName: string,
    reassignTo: string = 'General'
  ) => {
    const targetCategory = reassignTo.trim() || 'General';
    let reassignedCount = 0;

    // 1. Reassign articles to the target category
    setArticles((prev) =>
      prev.map((art) => {
        if (art.category === categoryName) {
          reassignedCount++;
          return {
            ...art,
            category: targetCategory,
            updatedAt: new Date().toISOString(),
          };
        }
        return art;
      })
    );

    // 2. Remove category from categories list and ensure target category exists
    setCategories((prev) => {
      const next = prev.filter((c) => c !== categoryName);
      if (!next.includes(targetCategory)) {
        return [...next, targetCategory];
      }
      return next;
    });

    // 3. Remove from autoCreatedCategories list
    setAutoCreatedCategories((prev) => prev.filter((c) => c !== categoryName));

    if (selectedCategoryFilter === categoryName) {
      setSelectedCategoryFilter('all');
    }

    showToast(
      `Categoría "${categoryName}" eliminada${
        reassignedCount > 0
          ? ` (${reassignedCount} artículo${reassignedCount === 1 ? '' : 's'} reasignado${reassignedCount === 1 ? '' : 's'} a "${targetCategory}")`
          : ''
      }.`
    );
  };

  const handleCleanUnusedCategories = () => {
    const assigned = new Set(
      articles
        .map((a) => a.category?.trim())
        .filter((c): c is string => Boolean(c))
    );
    const toRemove = categories.filter((c) => !assigned.has(c));
    if (toRemove.length === 0) {
      showToast('No hay categorías vacías para eliminar.');
      return;
    }
    const remaining = categories.filter((c) => assigned.has(c));
    const newCategories = remaining.length > 0 ? remaining : ['General'];
    setCategories(newCategories);
    setAutoCreatedCategories((prev) => prev.filter((c) => assigned.has(c)));
    showToast(`Se eliminaron ${toRemove.length} categorías sin artículos.`);
  };

  // Modal states
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [selectedForManualAdjust, setSelectedForManualAdjust] = useState<Article | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PWA Install hook
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Network online indicator
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save changes to localStorage whenever state updates
  useEffect(() => {
    saveStoredArticles(articles);
  }, [articles]);

  useEffect(() => {
    saveStoredMovements(movements);
  }, [movements]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Add / Edit article handler
  const handleSaveArticle = (articleToSave: Article) => {
    if (articleToSave.category) {
      ensureCategoriesRegistered([articleToSave.category], false);
    }

    const isExisting = articles.some((a) => a.id === articleToSave.id);

    if (isExisting) {
      setArticles((prev) =>
        prev.map((a) => (a.id === articleToSave.id ? articleToSave : a))
      );
      showToast(`Artículo "${articleToSave.code}" actualizado con éxito.`);
    } else {
      setArticles((prev) => [articleToSave, ...prev]);

      // Record initial creation movement
      if (articleToSave.quantity > 0) {
        const newMov: StockMovement = {
          id: `mov-${Date.now()}`,
          articleId: articleToSave.id,
          articleCode: articleToSave.code,
          articleDescription: articleToSave.description,
          type: 'alta_articulo',
          quantityChange: articleToSave.quantity,
          previousQuantity: 0,
          newQuantity: articleToSave.quantity,
          reason: 'Carga inicial de nuevo artículo',
          date: new Date().toISOString(),
        };
        setMovements((prev) => [newMov, ...prev]);
      }

      showToast(`Nuevo artículo "${articleToSave.code}" cargado al inventario.`);
    }
  };

  // Delete article triggers confirmation modal
  const handleDeleteArticle = (articleId: string) => {
    const art = articles.find((a) => a.id === articleId);
    if (!art) return;
    setArticleToDelete(art);
  };

  const handleConfirmDelete = () => {
    if (!articleToDelete) return;
    const id = articleToDelete.id;
    const code = articleToDelete.code;

    setArticles((prev) => prev.filter((a) => a.id !== id));
    setArticleToDelete(null);
    setIsArticleModalOpen(false);
    setEditingArticle(null);
    showToast(`Artículo "${code}" eliminado del catálogo.`);
  };

  // Quick inline adjustments (+1, -1) from card - allows negative stock
  const handleQuickAdjust = (article: Article, delta: number) => {
    const prevQty = article.quantity;
    const newQty = prevQty + delta; // Allows negative inventory!

    const updatedArticle = {
      ...article,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    };

    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? updatedArticle : a))
    );

    const newMov: StockMovement = {
      id: `mov-${Date.now()}`,
      articleId: article.id,
      articleCode: article.code,
      articleDescription: article.description,
      type: 'ajuste_manual',
      quantityChange: delta,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason: delta > 0 ? 'Ajuste rápido (+1)' : 'Ajuste rápido (-1)',
      date: new Date().toISOString(),
    };

    setMovements((prev) => [newMov, ...prev]);
  };

  // Open manual adjustment screen with specific article preselected
  const handleOpenManualAdjust = (article: Article) => {
    setSelectedForManualAdjust(article);
    setActiveTab('ajuste');
  };

  // Full manual adjustment submission
  const handleApplyManualAdjustment = ({
    articleId,
    quantityChange,
    newQuantity,
    reason,
    notes,
  }: {
    articleId: string;
    quantityChange: number;
    newQuantity: number;
    reason: string;
    notes?: string;
  }) => {
    const target = articles.find((a) => a.id === articleId);
    if (!target) return;

    const prevQty = target.quantity;

    const updatedArticle: Article = {
      ...target,
      quantity: newQuantity,
      updatedAt: new Date().toISOString(),
    };

    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? updatedArticle : a))
    );

    const newMov: StockMovement = {
      id: `mov-${Date.now()}`,
      articleId: target.id,
      articleCode: target.code,
      articleDescription: target.description,
      type: 'ajuste_manual',
      quantityChange,
      previousQuantity: prevQty,
      newQuantity,
      reason,
      notes,
      date: new Date().toISOString(),
    };

    setMovements((prev) => [newMov, ...prev]);
    showToast(
      `Ajuste aplicado: ${target.code} ahora tiene ${newQuantity} ${target.unit}.`
    );
  };

  // Confirm Carga de Stock (PDF)
  const handleConfirmPdfCarga = (result: ParsedPdfResult) => {
    const updatedArticles = [...articles];
    const newMovements: StockMovement[] = [];
    const timestamp = new Date().toISOString();

    result.items.forEach((item) => {
      const cleanCode = item.code.trim().toUpperCase();
      const existingIdx = updatedArticles.findIndex(
        (a) => a.code.toUpperCase() === cleanCode
      );

      if (existingIdx >= 0) {
        // Increment stock
        const existing = updatedArticles[existingIdx];
        const prevQty = existing.quantity;
        const newQty = prevQty + item.quantity;
        const newCategory =
          item.category && item.category !== 'General'
            ? item.category
            : existing.category;

        updatedArticles[existingIdx] = {
          ...existing,
          category: newCategory,
          quantity: newQty,
          updatedAt: timestamp,
        };

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          articleId: existing.id,
          articleCode: existing.code,
          articleDescription: existing.description,
          type: 'carga_pdf',
          quantityChange: item.quantity,
          previousQuantity: prevQty,
          newQuantity: newQty,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          partnerName: result.partnerName,
          notes: item.description,
          date: timestamp,
        });
      } else {
        // Create new article from PDF item
        const newArt: Article = {
          id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: cleanCode,
          description: item.description || 'Producto importado desde PDF',
          category: item.category || 'General',
          quantity: item.quantity,
          minStock: 5,
          unit: item.unit || 'u',
          price: item.unitPrice,
          updatedAt: timestamp,
        };

        updatedArticles.unshift(newArt);

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          articleId: newArt.id,
          articleCode: newArt.code,
          articleDescription: newArt.description,
          type: 'carga_pdf',
          quantityChange: item.quantity,
          previousQuantity: 0,
          newQuantity: item.quantity,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          partnerName: result.partnerName,
          notes: 'Alta y carga automática mediante PDF',
          date: timestamp,
        });
      }
    });

    const detectedCategories = result.items
      .map((item) => item.category)
      .filter((c): c is string => Boolean(c && c.trim()));
    const autoCats = ensureCategoriesRegistered(detectedCategories, true);

    setArticles(updatedArticles);
    setMovements((prev) => [...newMovements, ...prev]);
    showToast(
      `¡Carga completada! Se procesaron ${result.items.length} artículos del PDF.${
        autoCats.length > 0
          ? ` Nuevas categorías registradas: ${autoCats.join(', ')}.`
          : ''
      }`
    );
  };

  // Confirm Descarga de Stock (PDF) - Allows negative inventory
  const handleConfirmPdfDescarga = (result: ParsedPdfResult) => {
    const updatedArticles = [...articles];
    const newMovements: StockMovement[] = [];
    const timestamp = new Date().toISOString();

    result.items.forEach((item) => {
      const cleanCode = item.code.trim().toUpperCase();
      const existingIdx = updatedArticles.findIndex(
        (a) => a.code.toUpperCase() === cleanCode
      );

      if (existingIdx >= 0) {
        const existing = updatedArticles[existingIdx];
        const prevQty = existing.quantity;
        const newQty = prevQty - item.quantity; // Allows negative inventory!
        const actualDelta = -item.quantity;
        const newCategory =
          item.category && item.category !== 'General'
            ? item.category
            : existing.category;

        updatedArticles[existingIdx] = {
          ...existing,
          category: newCategory,
          quantity: newQty,
          updatedAt: timestamp,
        };

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          articleId: existing.id,
          articleCode: existing.code,
          articleDescription: existing.description,
          type: 'descarga_pdf',
          quantityChange: actualDelta,
          previousQuantity: prevQty,
          newQuantity: newQty,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          partnerName: result.partnerName,
          notes: item.description,
          date: timestamp,
        });
      } else {
        // Discharged item not previously registered: register with negative stock
        const newArticleId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newQty = -item.quantity;
        const newArticle: Article = {
          id: newArticleId,
          code: cleanCode,
          description: item.description || `Artículo ${cleanCode}`,
          quantity: newQty,
          unit: item.unit || 'u',
          minStock: 5,
          category: item.category || 'General',
          updatedAt: timestamp,
        };
        updatedArticles.push(newArticle);

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          articleId: newArticleId,
          articleCode: cleanCode,
          articleDescription: newArticle.description,
          type: 'descarga_pdf',
          quantityChange: -item.quantity,
          previousQuantity: 0,
          newQuantity: newQty,
          documentType: result.documentType,
          documentNumber: result.documentNumber,
          partnerName: result.partnerName,
          notes: 'Descarga de artículo no registrado previamente (saldo negativo)',
          date: timestamp,
        });
      }
    });

    const detectedCategories = result.items
      .map((item) => item.category)
      .filter((c): c is string => Boolean(c && c.trim()));
    const autoCats = ensureCategoriesRegistered(detectedCategories, true);

    setArticles(updatedArticles);
    setMovements((prev) => [...newMovements, ...prev]);
    showToast(
      `¡Descarga completada! Se descontaron los productos del documento ${result.documentNumber || ''}.${
        autoCats.length > 0
          ? ` Nuevas categorías registradas: ${autoCats.join(', ')}.`
          : ''
      }`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-20 md:pb-8">
      {/* Top App Bar Header */}
      <Header
        articles={articles}
        onOpenApkModal={() => setActiveTab('apk')}
        isInstallable={isInstallable}
        onInstallClick={install}
      />

      {/* Main Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'ajuste') {
            setSelectedForManualAdjust(null);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'articulos' && (
          <ArticlesList
            articles={articles}
            availableCategories={categories}
            autoCreatedCategories={autoCreatedCategories}
            selectedCategory={selectedCategoryFilter}
            onSelectCategory={setSelectedCategoryFilter}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            onAddCategory={handleAddCategory}
            onAddArticle={() => {
              setEditingArticle(null);
              setIsArticleModalOpen(true);
            }}
            onEditArticle={(art) => {
              setEditingArticle(art);
              setIsArticleModalOpen(true);
            }}
            onDeleteArticle={handleDeleteArticle}
            onQuickAdjust={handleQuickAdjust}
            onOpenManualAdjust={handleOpenManualAdjust}
          />
        )}

        {activeTab === 'pdf' && (
          <PdfProcessor
            articles={articles}
            availableCategories={categories}
            autoCreatedCategories={autoCreatedCategories}
            onConfirmCarga={handleConfirmPdfCarga}
            onConfirmDescarga={handleConfirmPdfDescarga}
            onAddCategory={handleAddCategory}
          />
        )}

        {activeTab === 'ajuste' && (
          <ManualAdjustment
            articles={articles}
            movements={movements}
            initialSelectedArticle={selectedForManualAdjust}
            onApplyAdjustment={handleApplyManualAdjustment}
          />
        )}

        {activeTab === 'historial' && <MovementsLog movements={movements} />}

        {activeTab === 'apk' && (
          <ApkInstallModal
            isInstallable={isInstallable}
            isInstalled={isInstalled}
            isIOS={isIOS}
            onInstall={install}
            onDataRestored={(restoredArticles, restoredMovements) => {
              setArticles(restoredArticles);
              setMovements(restoredMovements);
              showToast('Datos del inventario restaurados con éxito.');
            }}
          />
        )}
      </main>

      {/* Create / Edit Article Modal */}
      <ArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => {
          setIsArticleModalOpen(false);
          setEditingArticle(null);
        }}
        onSave={handleSaveArticle}
        existingArticle={editingArticle}
        allArticles={articles}
        availableCategories={categories}
        onAddCategory={handleAddCategory}
        onDeleteArticle={handleDeleteArticle}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!articleToDelete}
        article={articleToDelete}
        onClose={() => setArticleToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        autoCreatedCategories={autoCreatedCategories}
        articles={articles}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onFilterByCategory={(cat) => {
          setSelectedCategoryFilter(cat);
          setActiveTab('articulos');
        }}
        onCleanUnusedCategories={handleCleanUnusedCategories}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-14 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline activo: Datos guardados en tu dispositivo</span>
        </div>
      )}
    </div>
  );
}
