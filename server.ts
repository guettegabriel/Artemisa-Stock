import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function formatGeminiError(err: unknown): { message: string; statusCode: number; isTransient: boolean } {
  if (!err) {
    return {
      message: "Error desconocido al procesar el archivo PDF.",
      statusCode: 500,
      isTransient: false,
    };
  }

  let rawMsg = err instanceof Error ? err.message : String(err);

  // Try to parse ApiError JSON payload
  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        const code = parsed.error.code || 500;
        const status = parsed.error.status || "";
        const apiMessage = parsed.error.message;

        if (code === 503 || status === "UNAVAILABLE" || apiMessage.includes("high demand")) {
          return {
            message:
              "El servicio de Inteligencia Artificial está experimentando alta demanda momentánea. Por favor, pulsa 'Reintentar' en unos segundos.",
            statusCode: 503,
            isTransient: true,
          };
        }
        if (code === 429 || status === "RESOURCE_EXHAUSTED" || apiMessage.includes("quota")) {
          return {
            message:
              "Se ha alcanzado temporalmente la cuota de consultas. Por favor espera un momento y pulsa 'Reintentar'.",
            statusCode: 429,
            isTransient: true,
          };
        }
        return {
          message: apiMessage,
          statusCode: typeof code === "number" ? code : 500,
          isTransient: false,
        };
      }
    }
  } catch {
    // Ignore JSON parsing failure and fallback to substring check
  }

  if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
    return {
      message:
        "El servicio de Inteligencia Artificial tiene alta demanda momentánea. Por favor, pulsa 'Reintentar' en unos segundos.",
      statusCode: 503,
      isTransient: true,
    };
  }

  if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
    return {
      message:
        "Límite de solicitudes alcanzado momentáneamente. Por favor espera unos segundos e intenta nuevamente.",
      statusCode: 429,
      isTransient: true,
    };
  }

  if (rawMsg.includes("API_KEY") || rawMsg.includes("api_key")) {
    return {
      message: "No se encontró una clave GEMINI_API_KEY válida en el entorno del servidor.",
      statusCode: 401,
      isTransient: false,
    };
  }

  return {
    message: rawMsg,
    statusCode: 500,
    isTransient: false,
  };
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  requestParams: {
    contents: any[];
    config: any;
  }
) {
  // Flash models to cycle through in case of temporary high demand or 503 unavailable
  const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: unknown = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Analizando PDF con modelo '${model}' (intento ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: requestParams.contents,
          config: requestParams.config,
        });
        console.log(`[Gemini] Análisis exitoso con modelo '${model}'.`);
        return response;
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("overloaded");

        console.warn(
          `[Gemini] Advertencia con modelo '${model}' (intento ${attempt}):`,
          msg.slice(0, 200)
        );

        if (!isTransient) {
          // If it's a fatal non-transient error (e.g. invalid base64 or unauthorized), throw immediately
          throw err;
        }

        // Wait with backoff before retry or trying next model
        const delayMs = attempt * 1200 + Math.floor(Math.random() * 400);
        console.log(`[Gemini] Esperando ${delayMs}ms antes de reintentar...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large PDF base64 payloads
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));

  // Explicit handlers for root PWA manifest and service worker
  app.get("/manifest.json", (_req, res) => {
    const rootPath = path.join(process.cwd(), "manifest.json");
    const publicPath = path.join(process.cwd(), "public", "manifest.json");
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    if (fs.existsSync(rootPath)) {
      res.sendFile(rootPath);
    } else {
      res.sendFile(publicPath);
    }
  });

  app.get("/sw.js", (_req, res) => {
    const rootPath = path.join(process.cwd(), "sw.js");
    const publicPath = path.join(process.cwd(), "public", "sw.js");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    if (fs.existsSync(rootPath)) {
      res.sendFile(rootPath);
    } else {
      res.sendFile(publicPath);
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint to parse PDF for Stock Loading (Carga) or Unloading (Descarga)
  app.post("/api/parse-pdf", async (req, res) => {
    try {
      const { pdfBase64, mode, filename } = req.body;

      if (!pdfBase64) {
        res.status(400).json({
          success: false,
          error: "No se proporcionó el contenido del archivo PDF (pdfBase64).",
        });
        return;
      }

      // Clean base64 string if it contains data URI header
      const base64Data = pdfBase64.includes(",")
        ? pdfBase64.split(",")[1]
        : pdfBase64;

      const ai = getGenAI();

      const operationDescription =
        mode === "descarga"
          ? "DESCARGA / SALIDA DE STOCK (despacho, remito de entrega o factura de venta a clientes)"
          : "CARGA / ENTRADA DE STOCK (factura de compra de proveedor, remito de recepción o albarán de entrada)";

      const systemPrompt = `Eres un experto auditor de almacén, logística e inventario.
Tu tarea es analizar detalladamente el documento PDF adjunto que corresponde a una operación de ${operationDescription}.
Extrae de manera estricta y estructurada todos los artículos, productos o materiales listados.

Pautas críticas de extracción:
1. Para cada artículo identifica:
   - 'code': Código de artículo, SKU, código de barras, referencia o código de producto según figura en la tabla/documento. Si no tiene un código explícito, genera un código alfanumérico limpio y consistente basado en el tipo de producto (ej: 'ART-001', 'HERR-102', 'ELEC-05').
   - 'description': Nombre completo, descripción clara y especificación del artículo.
   - 'quantity': Cantidad exacta numérica positiva (número entero o decimal). NUNCA negativa ni cero si representa un ítem.
   - 'unit': Unidad de medida si aparece (ej: 'u', 'unidades', 'kg', 'mts', 'cajas', 'litros'). Por defecto 'u'.
   - 'unitPrice': Precio unitario si aparece, o 0 si no figura.
   - 'category': Categoría, sección, departamento o familia asignada al producto según figura en el documento o en sus encabezados/columnas (por ejemplo: 'LUXURY', 'OUTLET', 'CALZADO', 'TEXTIL', 'ACCESORIOS', o el rubro del producto como 'Ferretería', 'Electrónica', 'Herramientas', etc.). Si el documento menciona secciones o etiquetas como 'LUXURY' u 'OUTLET', extrae exactamente ese nombre en mayúsculas.
2. Identifica los metadatos del documento:
   - 'documentType': Tipo de comprobante (ej: Factura A/B/C, Remito, Orden de Compra, Albarán, Conteo de Stock).
   - 'documentNumber': Número de comprobante o folio si aparece.
   - 'documentDate': Fecha del documento en formato YYYY-MM-DD si es detectable.
   - 'partnerName': Proveedor o Cliente involucrado.
   - 'notes': Cualquier aclaración o condición especial detectada en el documento.`;

      const response = await generateContentWithRetry(ai, {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              {
                text: `Por favor extrae todos los artículos y cantidades para esta operación de ${mode === "descarga" ? "descarga de stock" : "carga de stock"}. Nombre de archivo: ${filename || "documento.pdf"}.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType: {
                type: Type.STRING,
                description: "Tipo de documento (Factura, Remito, etc.)",
              },
              documentNumber: {
                type: Type.STRING,
                description: "Número del comprobante",
              },
              documentDate: {
                type: Type.STRING,
                description: "Fecha del documento en formato ISO o legible",
              },
              partnerName: {
                type: Type.STRING,
                description: "Nombre del proveedor o cliente",
              },
              notes: {
                type: Type.STRING,
                description: "Notas u observaciones",
              },
              items: {
                type: Type.ARRAY,
                description: "Lista de productos extraídos del PDF",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: {
                      type: Type.STRING,
                      description: "Código de artículo o SKU",
                    },
                    description: {
                      type: Type.STRING,
                      description: "Descripción o nombre del producto",
                    },
                    quantity: {
                      type: Type.NUMBER,
                      description: "Cantidad numérica a ingresar o egresar",
                    },
                    unit: {
                      type: Type.STRING,
                      description: "Unidad (u, kg, lts, etc.)",
                    },
                    unitPrice: {
                      type: Type.NUMBER,
                      description: "Precio unitario si figura",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Categoría del producto",
                    },
                  },
                  required: ["code", "description", "quantity"],
                },
              },
            },
            required: ["documentType", "items"],
          },
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText);

      res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: unknown) {
      console.error("Error al procesar PDF con Gemini:", err);
      const { message, statusCode, isTransient } = formatGeminiError(err);
      res.status(statusCode).json({
        success: false,
        error: message,
        isTransient,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ARTEMISA Server activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fallo al iniciar el servidor:", err);
  process.exit(1);
});
