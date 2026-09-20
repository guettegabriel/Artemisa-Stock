import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Article } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  article: Article | null;
  onClose: () => void;
  onConfirm: (articleId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  article,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div
        id="delete-article-modal"
        className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              ¿Eliminar este artículo?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Esta acción eliminará el producto del catálogo y de la lista de inventario.
            </p>
          </div>
        </div>

        {/* Article Summary Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-blue-300 uppercase px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              {article.code}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Stock actual:{' '}
              <span
                className={`font-mono font-bold ${
                  article.quantity < 0
                    ? 'text-purple-400'
                    : article.quantity === 0
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {article.quantity} {article.unit}
              </span>
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 line-clamp-2">
            {article.description}
          </p>
          {article.category && (
            <p className="text-xs text-slate-400">Categoría: {article.category}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-delete-article"
            type="button"
            onClick={() => {
              onConfirm(article.id);
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
