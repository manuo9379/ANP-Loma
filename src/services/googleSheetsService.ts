import { Sale } from '../types';

export const uploadToGoogleDriveAndSheets = async (sales: Sale[], todayDate: string, accessToken: string): Promise<string> => {
  // 1. Generic Fetch Wrapper for Google API (it passes OAuth token automatically)
  const callApi = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en la llamada de Google API (${response.status}): ${errText}`);
    }
    return response.json();
  };

  // 2. Search or Create "Mr. Roboto" Folder
  const searchMrRobotoUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    "name='Mr. Roboto' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false"
  )}`;
  const mrRobotoSearch = await callApi(searchMrRobotoUrl);
  let mrRobotoId = '';
  
  if (mrRobotoSearch.files && mrRobotoSearch.files.length > 0) {
    mrRobotoId = mrRobotoSearch.files[0].id;
  } else {
    // Create it
    const createMrRoboto = await callApi('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mr. Roboto',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
      }),
    });
    mrRobotoId = createMrRoboto.id;
  }

  // 3. Search or Create "Sistema Loma" Folder inside "Mr. Roboto"
  const searchSistemaLomaUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='Sistema Loma' and mimeType='application/vnd.google-apps.folder' and '${mrRobotoId}' in parents and trashed=false`
  )}`;
  const sistemaLomaSearch = await callApi(searchSistemaLomaUrl);
  let sistemaLomaId = '';
  
  if (sistemaLomaSearch.files && sistemaLomaSearch.files.length > 0) {
    sistemaLomaId = sistemaLomaSearch.files[0].id;
  } else {
    // Create it
    const createSistemaLoma = await callApi('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sistema Loma',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [mrRobotoId],
      }),
    });
    sistemaLomaId = createSistemaLoma.id;
  }

  // 4. Create Google Sheet inside "Sistema Loma" folder
  const createSheetRes = await callApi('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    body: JSON.stringify({
      name: `Ventas_Punta_Loma_${todayDate}`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [sistemaLomaId],
    }),
  });
  const spreadsheetId = createSheetRes.id;

  // 5. Get the first sheet's title
  const sheetMetadata = await callApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  const firstSheetTitle = sheetMetadata.sheets?.[0]?.properties?.title || 'Sheet1';

  // 6. Generate Data Rows
  const headers = [
    'ID de Venta',
    'Fecha y Hora',
    'Cajero (Vendedor)',
    'Comprador',
    'Residencia',
    'Medio de Pago',
    'Número de Operación / Ref.',
    'Entradas Extranjeros',
    'Entradas Nacionales',
    'Entradas Residentes',
    'Entradas Menores/Jubilados',
    'Monto Total ($)'
  ];

  const rows = sales.map(sale => {
    const qtyExtranjero = sale.items.filter(i => i.category === 'extranjero').reduce((acc, i) => acc + i.qty, 0);
    const qtyNacional = sale.items.filter(i => i.category === 'nacional').reduce((acc, i) => acc + i.qty, 0);
    const qtyResidente = sale.items.filter(i => i.category === 'residente').reduce((acc, i) => acc + i.qty, 0);
    const qtyMinor = sale.items.filter(i => i.category === 'minor').reduce((acc, i) => acc + i.qty, 0);
    
    const saleDate = new Date(sale.timestamp).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return [
      sale.id,
      saleDate,
      sale.userName || 'N/C',
      sale.customerName || 'N/C',
      sale.customerResidence || 'N/C',
      sale.paymentMethod || 'N/C',
      sale.paymentRef || 'N/C',
      qtyExtranjero.toString(),
      qtyNacional.toString(),
      qtyResidente.toString(),
      qtyMinor.toString(),
      sale.totalAmount.toString()
    ];
  });

  // 7. Write to Google Sheet
  await callApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetTitle)}!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({
      range: `${firstSheetTitle}!A1`,
      majorDimension: 'ROWS',
      values: [
        headers,
        ...rows
      ],
    }),
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};
