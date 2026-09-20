import { Article, StockMovement } from '../types';
import { initialArticles, initialMovements } from '../data/initialData';

const ARTICLES_KEY = 'stockmaster_articles_v1';
const MOVEMENTS_KEY = 'stockmaster_movements_v1';
const CATEGORIES_KEY = 'stockmaster_categories_v2';
const AUTO_CATEGORIES_KEY = 'stockmaster_auto_categories_v1';

export const DEFAULT_CATEGORIES = Array.from(
  new Set(initialArticles.map((a) => a.category?.trim()).filter(Boolean) as string[])
).sort();

const CLEANUP_KEY = 'stockmaster_categories_assigned_only_v1';

export function getStoredCategories(): string[] {
  try {
    const rawArticles = localStorage.getItem(ARTICLES_KEY);
    const articles: Article[] = rawArticles ? JSON.parse(rawArticles) : initialArticles;

    // One-time cleanup migration:
    // Update category list to only keep categories currently assigned to articles,
    // removing unused placeholders. Future created categories will be preserved.
    const hasCleaned = localStorage.getItem(CLEANUP_KEY) === 'true';

    if (!hasCleaned) {
      const assigned = Array.from(
        new Set(articles.map((a) => a.category?.trim()).filter(Boolean) as string[])
      ).sort();

      const cleanedList = assigned.length > 0 ? assigned : DEFAULT_CATEGORIES;
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cleanedList));
      localStorage.setItem(CLEANUP_KEY, 'true');
      return cleanedList;
    }

    const raw = localStorage.getItem(CATEGORIES_KEY);
    const autoCats = getStoredAutoCategories();
    let baseList: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed;
        }
      } catch {}
    }
    if (baseList.length === 0) {
      baseList = DEFAULT_CATEGORIES;
    }
    // Always include any categories present in articles or auto-created list (e.g. LUXURY, OUTLET)
    const articleCats = articles.map((a) => a.category?.trim()).filter(Boolean) as string[];
    const combined = Array.from(new Set([...baseList, ...autoCats, ...articleCats]));
    return combined.length > 0 ? combined : DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Error al leer categorías de localStorage:', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveStoredCategories(categories: string[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error al guardar categorías en localStorage:', e);
  }
}

export function getStoredAutoCategories(): string[] {
  try {
    const raw = localStorage.getItem(AUTO_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error al leer categorías automáticas de localStorage:', e);
    return [];
  }
}

export function saveStoredAutoCategories(categories: string[]): void {
  try {
    localStorage.setItem(AUTO_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error al guardar categorías automáticas en localStorage:', e);
  }
}

export function getStoredArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (!raw) {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(initialArticles));
      return initialArticles;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error al leer artículos de localStorage:', e);
    return initialArticles;
  }
}

export function saveStoredArticles(articles: Article[]): void {
  try {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
  } catch (e) {
    console.error('Error al guardar artículos en localStorage:', e);
  }
}

export function getStoredMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(initialMovements));
      return initialMovements;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error al leer movimientos de localStorage:', e);
    return initialMovements;
  }
}

export function saveStoredMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  } catch (e) {
    console.error('Error al guardar movimientos en localStorage:', e);
  }
}

export function resetAllData(): { articles: Article[]; movements: StockMovement[] } {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(initialArticles));
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(initialMovements));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(AUTO_CATEGORIES_KEY, JSON.stringify([]));
  return { articles: initialArticles, movements: initialMovements };
}

export function exportBackupData(): string {
  const data = {
    app: 'StockMaster APK',
    version: '1.0',
    exportDate: new Date().toISOString(),
    articles: getStoredArticles(),
    movements: getStoredMovements(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): { success: boolean; message: string; articles?: Article[]; movements?: StockMovement[] } {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data.articles)) {
      return { success: false, message: 'Formato inválido: falta la lista de artículos.' };
    }
    saveStoredArticles(data.articles);
    if (Array.isArray(data.movements)) {
      saveStoredMovements(data.movements);
    }
    return {
      success: true,
      message: `Restauración exitosa: ${data.articles.length} artículos importados.`,
      articles: data.articles,
      movements: Array.isArray(data.movements) ? data.movements : [],
    };
  } catch (e: unknown) {
    return {
      success: false,
      message: `Error al importar: ${e instanceof Error ? e.message : 'JSON no válido'}`,
    };
  }
}
