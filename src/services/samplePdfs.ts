// Helper to generate a valid PDF file in memory for instant testing
export function createMinimalPdf(title: string, lines: string[]): { blob: Blob; base64: string } {
  // Construct a standard PDF 1.4 document with text content
  const textStreamParts: string[] = [
    'BT',
    '/F1 16 Tf',
    '50 750 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
  ];

  lines.forEach((line) => {
    textStreamParts.push(`(${escapePdfText(line)}) Tj`);
    textStreamParts.push('0 -18 Td');
  });

  textStreamParts.push('ET');
  const streamContent = textStreamParts.join('\n');
  const streamLength = streamContent.length;

  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );

  // Obj 4: Stream content
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`);

  // Obj 5: Font (Type1 Helvetica)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdfContent = '%PDF-1.4\n';
  const xrefOffsets: number[] = [0];

  objects.forEach((obj) => {
    xrefOffsets.push(pdfContent.length);
    pdfContent += obj;
  });

  const startXref = pdfContent.length;
  pdfContent += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
    pdfContent += `${offsetStr} 00000 n \n`;
  }

  pdfContent += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const base64 = btoa(unescape(encodeURIComponent(pdfContent)));

  return { blob, base64: `data:application/pdf;base64,${base64}` };
}

function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function getSampleInvoicePdf(): { name: string; blob: Blob; base64: string } {
  const lines = [
    'PROVEEDOR: DISTRIBUIDORA FERRETERA CENTRAL S.A. - CUIT: 30-71829304-8',
    'COMPROBANTE: FACTURA A NRO: 0003-00049281 | FECHA: 2026-09-18',
    'CLIENTE: DEPOSITO CENTRAL DE STOCK',
    '--------------------------------------------------------------------------------',
    'CODIGO        DESCRIPCION                                CANT.   UNID.   P.UNIT.',
    'TAL-20V-01    Taladro Percutor Inalambrico 20V            10      u      $125000',
    'DIS-COR-115   Disco de Corte Fino Metal 115x1.0mm        100      u        $1850',
    'CAB-UNI-25    Cable Unipolar 2.5mm Rollo 100m             15      rollo   $48000',
    'PIN-UNI-8     Pinza Universal 8 Pulgadas Aislada          12      u       $16500',
    'BRO-CON-08    Broca de Vidia para Concreto 8mm (NUEVO)    30      u        $4200',
    '--------------------------------------------------------------------------------',
    'CONDICION: Entrega Inmediata a Almacen | Conforme recepcion de mercaderia',
  ];

  const { blob, base64 } = createMinimalPdf('FACTURA DE COMPRA - CARGA DE STOCK', lines);
  return {
    name: 'Factura_Proveedor_0003-00049281.pdf',
    blob,
    base64,
  };
}

export function getSampleDispatchPdf(): { name: string; blob: Blob; base64: string } {
  const lines = [
    'CLIENTE: CONSTRUCTORA DEL SUR S.R.L. - OBRAS CIVILES',
    'COMPROBANTE: REMITO DE DESPACHO NRO: 0001-00015940 | FECHA: 2026-09-19',
    'DESTINO: OBRA CENTRAL PARQUE INDUSTRIAL',
    '--------------------------------------------------------------------------------',
    'CODIGO        DESCRIPCION                                CANT.   UNID.   DESTINO',
    'TAL-20V-01    Taladro Percutor Inalambrico 20V             2      u       Obra 1',
    'DIS-COR-115   Disco de Corte Fino Metal 115x1.0mm         40      u       Taller',
    'LUB-WD-400    Lubricante Multiuso Aerosol 400ml           10      u       Mantenim.',
    'TOR-AUT-50    Tornillo Autoperforante T1 Punta Mecha       5      caja    Montaje',
    '--------------------------------------------------------------------------------',
    'OBSERVACION: Despachar antes de las 18:00hs. Salida autorizada de deposito.',
  ];

  const { blob, base64 } = createMinimalPdf('REMITO DE SALIDA - DESCARGA DE STOCK', lines);
  return {
    name: 'Remito_Despacho_0001-00015940.pdf',
    blob,
    base64,
  };
}

export function getSampleLuxuryInvoicePdf(): { name: string; blob: Blob; base64: string } {
  const lines = [
    'PROVEEDOR: MODA & IMPORTACIONES TRENDS S.A. - CUIT: 30-74558291-3',
    'COMPROBANTE: FACTURA DE IMPORTACION NRO: 0008-00091240 | FECHA: 2026-09-19',
    'DEPARTAMENTO: SELECCION LUXURY & SELECCION OUTLET',
    '--------------------------------------------------------------------------------',
    'CODIGO        DESCRIPCION                                CANT.   UNID.   CATEGORIA',
    'LUX-BOL-01    Bolso de Cuero Italiano Coleccion Oro        6      u       LUXURY',
    'LUX-REL-09    Reloj Cronografo Zafiro Edicion Limitada     4      u       LUXURY',
    'OUT-ZAP-03    Zapatillas Running Street Outlet Temporada  20      par     OUTLET',
    'OUT-CAM-15    Camisa Slim Fit Algodon Liquidacion         35      u       OUTLET',
    'LUX-GAF-05    Gafas Aviador Polarizadas Titanio            8      u       LUXURY',
    '--------------------------------------------------------------------------------',
    'CONDICION: Mercaderia categorizada en seccion LUXURY y seccion OUTLET.',
  ];

  const { blob, base64 } = createMinimalPdf('FACTURA MODA - LUXURY Y OUTLET', lines);
  return {
    name: 'Factura_Moda_Luxury_Outlet_0008-00091240.pdf',
    blob,
    base64,
  };
}
