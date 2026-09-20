export interface Article {
  id: string;
  code: string; // SKU / Código de barras / Referencia
  description: string;
  category: string;
  quantity: number; // Stock presente actual
  minStock: number; // Umbral de stock mínimo para alertas
  unit: string; // u, kg, mts, caja, lts
  location?: string; // Estantería, pasillo o depósito
  price?: number; // Precio de referencia
  updatedAt: string;
}

export type MovementType = 'carga_pdf' | 'descarga_pdf' | 'ajuste_manual' | 'alta_articulo' | 'baja_articulo';

export interface StockMovement {
  id: string;
  articleId: string;
  articleCode: string;
  articleDescription: string;
  type: MovementType;
  quantityChange: number; // positivo para entrada, negativo para salida
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  documentNumber?: string;
  documentType?: string;
  partnerName?: string;
  date: string;
  notes?: string;
}

export interface ParsedPdfItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  category?: string;
  matchedArticleId?: string;
  isNew?: boolean;
  currentStock?: number;
  hasInsufficientStock?: boolean;
}

export interface ParsedPdfResult {
  documentType: string;
  documentNumber?: string;
  documentDate?: string;
  partnerName?: string;
  notes?: string;
  items: ParsedPdfItem[];
}

export type ActiveTab = 'articulos' | 'pdf' | 'ajuste' | 'historial' | 'apk';
