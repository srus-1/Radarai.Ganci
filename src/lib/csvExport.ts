import { Order } from '@/types/order';
import { CapexEntry, RawMaterialEntry } from '@/types/capex';

/**
 * Escapes a CSV field adhering strictly to RFC 4180.
 * If value contains comma, double-quote, or newline, wraps in double quotes and doubles internal quotes.
 */
export function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats numeric values strictly for Machine Learning pipelines.
 * Outputs raw numeric values only (no 'Rp', no '%', no thousand separators).
 * Null, undefined, NaN, or non-finite values default strictly to '0'.
 */
export function formatNumericML(val: number | null | undefined): string {
  if (val === null || val === undefined || typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return '0';
  }
  if (Object.is(val, -0) || val === 0) {
    return '0';
  }
  return String(val);
}

/**
 * Normalizes a date string to YYYY-MM-DD format.
 */
export function formatDateML(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Direct YYYY-MM-DD prefix preservation (timezone-safe)
  const isoPrefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefixMatch) {
    const candidate = isoPrefixMatch[1];
    const parsed = new Date(`${candidate}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(candidate)) {
      return candidate;
    }
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().split('T')[0];
}

/**
 * Normalizes a timestamp string to ISO-8601 UTC format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export function formatTimestampML(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString();
}

/**
 * R4.1 Export Orders to ML-Ready CSV (For AI Training)
 * Strictly excludes unstructured free-text and complex nested objects: specs, notes, designFiles.
 */
export function exportOrdersToCSV(orders: Order[]): string {
  const headers = [
    'order_id',
    'order_number',
    'order_date',
    'deadline',
    'buyer_name',
    'buyer_phone',
    'product_name',
    'qty',
    'price_per_pcs',
    'omzet',
    'hpp_bahan_baku',
    'hpp_tinta_sablon',
    'hpp_tenaga_kerja',
    'hpp_kemasan',
    'hpp_overhead',
    'total_hpp_per_pcs',
    'total_hpp',
    'profit',
    'margin_pct',
    'payment_status',
    'dp_amount',
    'remaining_payment',
    'process_status',
    'queue_order',
    'created_at',
    'updated_at',
  ];

  const safeOrders = Array.isArray(orders) ? orders : [];

  const rows = safeOrders.map((o) => [
    escapeCSVField(o.id),
    escapeCSVField(o.orderNumber),
    formatDateML(o.orderDate),
    formatDateML(o.deadline),
    escapeCSVField(o.buyerName),
    escapeCSVField(o.buyerPhone),
    escapeCSVField(o.productName),
    formatNumericML(o.qty),
    formatNumericML(o.pricePerPcs),
    formatNumericML(o.omzet),
    formatNumericML(o.hppBreakdown?.bahanBaku ?? 0),
    formatNumericML(o.hppBreakdown?.tintaSablon ?? 0),
    formatNumericML(o.hppBreakdown?.tenagaKerja ?? 0),
    formatNumericML(o.hppBreakdown?.kemasan ?? 0),
    formatNumericML(o.hppBreakdown?.overhead ?? 0),
    formatNumericML(o.hppBreakdown?.totalHppPerPcs ?? 0),
    formatNumericML(o.hppBreakdown?.totalHpp ?? 0),
    formatNumericML(o.profit),
    formatNumericML(o.marginPct),
    escapeCSVField(o.paymentStatus),
    formatNumericML(o.dpAmount),
    formatNumericML(o.remainingPayment),
    escapeCSVField(o.processStatus),
    formatNumericML(o.queueOrder),
    formatTimestampML(o.createdAt),
    formatTimestampML(o.updatedAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * R4.2 Export Capex to ML-Ready CSV (For AI Training)
 * Strictly excludes unstructured free-text: notes, description.
 */
export function exportCapexToCSV(capex: CapexEntry[]): string {
  const headers = [
    'capex_id',
    'entry_date',
    'category',
    'item_name',
    'amount',
    'useful_life_months',
    'monthly_depreciation',
    'created_at',
    'updated_at',
  ];

  const safeCapex = Array.isArray(capex) ? capex : [];

  const rows = safeCapex.map((c) => [
    escapeCSVField(c.id),
    formatDateML(c.entryDate),
    escapeCSVField(c.category),
    escapeCSVField(c.itemName),
    formatNumericML(c.amount),
    formatNumericML(c.usefulLifeMonths ?? 0),
    formatNumericML(c.monthlyDepreciation ?? 0),
    formatTimestampML(c.createdAt),
    formatTimestampML(c.updatedAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * R4.3 Export Recurring Raw Materials to ML-Ready CSV (For AI Training)
 * Strictly excludes unstructured free-text: notes.
 */
export function exportRawMaterialsToCSV(materials: RawMaterialEntry[]): string {
  const headers = [
    'material_id',
    'entry_date',
    'material_name',
    'category',
    'supplier',
    'qty',
    'unit',
    'unit_price',
    'total_amount',
    'created_at',
    'updated_at',
  ];

  const safeMaterials = Array.isArray(materials) ? materials : [];

  const rows = safeMaterials.map((m) => [
    escapeCSVField(m.id),
    formatDateML(m.entryDate),
    escapeCSVField(m.materialName),
    escapeCSVField(m.category),
    escapeCSVField(m.supplier),
    formatNumericML(m.qty ?? m.quantity),
    escapeCSVField(m.unit),
    formatNumericML(m.unitPrice),
    formatNumericML(m.totalAmount),
    formatTimestampML(m.createdAt),
    formatTimestampML(m.updatedAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM.
 */
export function downloadCSVFile(filename: string, content: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const cleanContent = content.startsWith('\uFEFF') ? content : `\uFEFF${content}`;
  const blob = new Blob([cleanContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// OWNER REPORTS: EXCEL (.xls) & PDF (.pdf) GENERATORS
// Designed for Business Owner review (includes full descriptions, Rupiah formatting, & summary totals)
// ============================================================================

function escapeHtml(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRpOwner(amount: number | null | undefined): string {
  const num = Number(amount) || 0;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function wrapExcelWorkbook(sheetName: string, bodyHtml: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(sheetName)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    table { border-collapse: collapse; width: 100%; }
    th { background-color: #0a1530; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
    td { padding: 6px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
    .num { text-align: right; mso-number-format: "#,##0"; }
    .title { font-size: 14pt; font-weight: bold; color: #0a1530; }
    .subtitle { font-size: 10pt; color: #5d5b54; }
    .total-row td { background-color: #e6e0f5; font-weight: bold; color: #1a1a1a; border-top: 2px solid #0a1530; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Generates an Owner-friendly Excel (.xls) workbook for Orders.
 * Includes full product specs, notes, payment/process status, and financial summary totals.
 */
export function exportOrdersToExcel(orders: Order[], periodLabel = 'Semua Periode'): string {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalQty = safeOrders.reduce((s, o) => s + (Number(o.qty) || 0), 0);
  const totalOmzet = safeOrders.reduce((s, o) => s + (Number(o.omzet) || 0), 0);
  const totalHpp = safeOrders.reduce((s, o) => s + (Number(o.hppBreakdown?.totalHpp) || 0), 0);
  const totalProfit = safeOrders.reduce((s, o) => s + (Number(o.profit) || 0), 0);
  const totalDp = safeOrders.reduce((s, o) => s + (Number(o.dpAmount) || 0), 0);
  const totalRemaining = safeOrders.reduce((s, o) => s + (Number(o.remainingPayment) || 0), 0);
  const avgMargin =
    totalOmzet > 0 ? Math.round(((totalProfit / totalOmzet) * 100) * 10) / 10 : 0;

  const rowsHtml = safeOrders
    .map(
      (o, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(o.orderNumber)}</td>
      <td>${escapeHtml(formatDateML(o.orderDate))}</td>
      <td>${escapeHtml(formatDateML(o.deadline))}</td>
      <td>${escapeHtml(o.buyerName)}</td>
      <td>${escapeHtml(o.buyerPhone)}</td>
      <td>${escapeHtml(o.productName)}</td>
      <td>${escapeHtml(o.specs || '-')}</td>
      <td class="num">${Number(o.qty) || 0}</td>
      <td class="num">${Number(o.pricePerPcs) || 0}</td>
      <td class="num">${Number(o.omzet) || 0}</td>
      <td class="num">${Number(o.hppBreakdown?.totalHpp) || 0}</td>
      <td class="num">${Number(o.profit) || 0}</td>
      <td class="num">${Number(o.marginPct) || 0}%</td>
      <td>${escapeHtml(o.paymentStatus)}</td>
      <td class="num">${Number(o.dpAmount) || 0}</td>
      <td class="num">${Number(o.remainingPayment) || 0}</td>
      <td>${escapeHtml(o.processStatus)}</td>
      <td>${escapeHtml(o.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <table>
    <tr><td colspan="19" class="title">LAPORAN PESANAN OWNER — EGANCI (MAFREND.ORDER)</td></tr>
    <tr><td colspan="19" class="subtitle">Periode / Filter: ${escapeHtml(periodLabel)} | Total Data: ${safeOrders.length} Pesanan</td></tr>
    <tr><td colspan="19"></td></tr>
    <thead>
      <tr>
        <th>No</th>
        <th>No. Pesanan</th>
        <th>Tgl Pesan</th>
        <th>Deadline</th>
        <th>Pelanggan</th>
        <th>No. WhatsApp</th>
        <th>Produk</th>
        <th>Spesifikasi</th>
        <th>Qty (pcs)</th>
        <th>Harga/pcs (Rp)</th>
        <th>Omzet (Rp)</th>
        <th>Total HPP (Rp)</th>
        <th>Laba Bersih (Rp)</th>
        <th>Margin (%)</th>
        <th>Status Bayar</th>
        <th>DP Masuk (Rp)</th>
        <th>Sisa Piutang (Rp)</th>
        <th>Status Produksi</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="8">TOTAL RINGKASAN OWNER</td>
        <td class="num">${totalQty}</td>
        <td>-</td>
        <td class="num">${totalOmzet}</td>
        <td class="num">${totalHpp}</td>
        <td class="num">${totalProfit}</td>
        <td class="num">${avgMargin}%</td>
        <td>-</td>
        <td class="num">${totalDp}</td>
        <td class="num">${totalRemaining}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>`;

  return wrapExcelWorkbook('Laporan Pesanan', body);
}

/**
 * Generates an Owner-friendly Excel (.xls) workbook for Capex.
 */
export function exportCapexToExcel(capex: CapexEntry[], periodLabel = 'Semua Periode'): string {
  const safeCapex = Array.isArray(capex) ? capex : [];
  const totalAmount = safeCapex.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const rowsHtml = safeCapex
    .map(
      (c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(formatDateML(c.entryDate))}</td>
      <td>${escapeHtml(c.itemName)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td class="num">${Number(c.amount) || 0}</td>
      <td>${escapeHtml(c.description || c.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <table>
    <tr><td colspan="6" class="title">LAPORAN BELANJA MODAL (CAPEX) OWNER — EGANCI</td></tr>
    <tr><td colspan="6" class="subtitle">Periode: ${escapeHtml(periodLabel)} | Total Transaksi: ${safeCapex.length} Item</td></tr>
    <tr><td colspan="6"></td></tr>
    <thead>
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Nama Barang / Aset</th>
        <th>Kategori</th>
        <th>Biaya Pembelian (Rp)</th>
        <th>Keterangan / Spesifikasi</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4">TOTAL BELANJA MODAL (CAPEX)</td>
        <td class="num">${totalAmount}</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;

  return wrapExcelWorkbook('Laporan Capex', body);
}

/**
 * Generates an Owner-friendly Excel (.xls) workbook for Recurring Raw Materials.
 */
export function exportRawMaterialsToExcel(
  materials: RawMaterialEntry[],
  periodLabel = 'Semua Periode'
): string {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const totalQty = safeMaterials.reduce((s, m) => s + (Number(m.qty ?? m.quantity) || 0), 0);
  const totalAmount = safeMaterials.reduce((s, m) => s + (Number(m.totalAmount) || 0), 0);

  const rowsHtml = safeMaterials
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(formatDateML(m.entryDate))}</td>
      <td>${escapeHtml(m.materialName)}</td>
      <td>${escapeHtml(m.category)}</td>
      <td>${escapeHtml(m.supplier || '-')}</td>
      <td class="num">${Number(m.qty ?? m.quantity) || 0}</td>
      <td>${escapeHtml(m.unit)}</td>
      <td class="num">${Number(m.unitPrice) || 0}</td>
      <td class="num">${Number(m.totalAmount) || 0}</td>
      <td>${escapeHtml(m.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <table>
    <tr><td colspan="10" class="title">LAPORAN BAHAN BAKU BERULANG OWNER — EGANCI</td></tr>
    <tr><td colspan="10" class="subtitle">Periode: ${escapeHtml(periodLabel)} | Total Nota: ${safeMaterials.length} Item</td></tr>
    <tr><td colspan="10"></td></tr>
    <thead>
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Nama Bahan Baku</th>
        <th>Kategori</th>
        <th>Supplier / Toko</th>
        <th>Volume</th>
        <th>Satuan</th>
        <th>Harga Satuan (Rp)</th>
        <th>Total Biaya (Rp)</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="5">TOTAL BELANJA BAHAN BAKU</td>
        <td class="num">${totalQty}</td>
        <td>-</td>
        <td>-</td>
        <td class="num">${totalAmount}</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;

  return wrapExcelWorkbook('Laporan Bahan Baku', body);
}

/**
 * Triggers a browser download of an Excel (.xls) file with UTF-8 BOM.
 */
export function downloadExcelFile(filename: string, content: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const cleanContent = content.startsWith('\uFEFF') ? content : `\uFEFF${content}`;
  const blob = new Blob([cleanContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalName =
    filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  link.setAttribute('download', finalName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to render and trigger a print/save-to-PDF dialog via a hidden iframe (never blocked by popup blockers).
 */
function triggerPrintPDFDocument(documentTitle: string, bodyContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 8px; font-size: 10px; line-height: 1.4; }
    .header { background: #0a1530; color: #ffffff; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 16px; font-weight: 700; }
    .header p { margin: 3px 0 0; font-size: 11px; color: #d6b6f6; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi-card { padding: 10px 12px; border-radius: 8px; border: 1px solid #d6d3cd; }
    .kpi-sky { background: #dcecfa; }
    .kpi-lavender { background: #e6e0f5; }
    .kpi-mint { background: #d9f3e1; }
    .kpi-peach { background: #ffe8d4; }
    .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #37352f; }
    .kpi-val { font-size: 14px; font-weight: 800; color: #1a1a1a; margin-top: 3px; }
    .kpi-sub { font-size: 9px; color: #37352f; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th { background: #0a1530; color: #ffffff; padding: 6px 7px; text-align: left; font-weight: 700; border: 1px solid #1a2a52; }
    td { padding: 5px 7px; border: 1px solid #d6d3cd; vertical-align: top; }
    tr:nth-child(even) td { background: #fbfbfa; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .bold { font-weight: 700; }
    .profit { color: #0d5220; font-weight: 700; }
    .total-row td { background: #e6e0f5 !important; font-weight: 800; border-top: 2px solid #0a1530; font-size: 10px; }
    .footer-note { margin-top: 10px; font-size: 9px; color: #787671; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 250);
}

/**
 * Exports Orders to a styled Owner PDF Report (triggers Save-as-PDF / Print dialog).
 */
export function exportOrdersToPDF(
  orders: Order[],
  reportTitle = 'Laporan Pesanan & Profitabilitas Owner',
  periodLabel = 'Semua Periode'
): void {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalQty = safeOrders.reduce((s, o) => s + (Number(o.qty) || 0), 0);
  const totalOmzet = safeOrders.reduce((s, o) => s + (Number(o.omzet) || 0), 0);
  const totalHpp = safeOrders.reduce((s, o) => s + (Number(o.hppBreakdown?.totalHpp) || 0), 0);
  const totalProfit = safeOrders.reduce((s, o) => s + (Number(o.profit) || 0), 0);
  const totalRemaining = safeOrders.reduce((s, o) => s + (Number(o.remainingPayment) || 0), 0);
  const avgMargin =
    totalOmzet > 0 ? Math.round(((totalProfit / totalOmzet) * 100) * 10) / 10 : 0;

  const rowsHtml = safeOrders
    .map(
      (o, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td class="bold">${escapeHtml(o.orderNumber)}<br/><span style="color:#787671;font-weight:normal">${escapeHtml(formatDateML(o.orderDate))}</span></td>
      <td><span class="bold">${escapeHtml(o.buyerName)}</span><br/>${escapeHtml(o.buyerPhone)}</td>
      <td><span class="bold">${escapeHtml(o.productName)}</span><br/><span style="color:#5d5b54">${escapeHtml(o.specs || '-')}</span></td>
      <td class="right bold">${(Number(o.qty) || 0).toLocaleString('id-ID')}</td>
      <td class="right">${formatRpOwner(o.omzet)}</td>
      <td class="right">${formatRpOwner(o.hppBreakdown?.totalHpp ?? 0)}</td>
      <td class="right profit">${formatRpOwner(o.profit)} (${Number(o.marginPct) || 0}%)</td>
      <td>${escapeHtml(o.paymentStatus)}${o.remainingPayment > 0 ? `<br/><span style="color:#9a3412">Sisa: ${formatRpOwner(o.remainingPayment)}</span>` : ''}</td>
      <td>${escapeHtml(o.processStatus)}</td>
      <td>${escapeHtml(o.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <div class="header">
    <div>
      <h1>${escapeHtml(reportTitle)}</h1>
      <p>eganci (Mafrend.Order) — Dokumen Resmi Owner | Filter: ${escapeHtml(periodLabel)}</p>
    </div>
    <div style="text-align:right;font-size:10px;">
      <strong>Total Data: ${safeOrders.length} Pesanan</strong><br/>
      Volume: ${totalQty.toLocaleString('id-ID')} pcs
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card kpi-sky">
      <div class="kpi-label">Total Omzet</div>
      <div class="kpi-val">${formatRpOwner(totalOmzet)}</div>
      <div class="kpi-sub">${safeOrders.length} pesanan (${totalQty.toLocaleString('id-ID')} pcs)</div>
    </div>
    <div class="kpi-card kpi-lavender">
      <div class="kpi-label">Total HPP Produksi</div>
      <div class="kpi-val">${formatRpOwner(totalHpp)}</div>
      <div class="kpi-sub">Biaya bahan, sablon, kerja & kemasan</div>
    </div>
    <div class="kpi-card kpi-mint">
      <div class="kpi-label">Laba Bersih Pesanan</div>
      <div class="kpi-val">${formatRpOwner(totalProfit)}</div>
      <div class="kpi-sub">Rata-rata Margin: ${avgMargin}%</div>
    </div>
    <div class="kpi-card kpi-peach">
      <div class="kpi-label">Sisa Piutang / DP</div>
      <div class="kpi-val">${formatRpOwner(totalRemaining)}</div>
      <div class="kpi-sub">Tagihan belum lunas</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:24px">No</th>
        <th>No. Pesanan & Tgl</th>
        <th>Pelanggan</th>
        <th>Produk & Spesifikasi</th>
        <th class="right">Qty</th>
        <th class="right">Omzet</th>
        <th class="right">Total HPP</th>
        <th class="right">Laba (Margin)</th>
        <th>Pembayaran</th>
        <th>Status</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4">TOTAL KESELURUHAN</td>
        <td class="right">${totalQty.toLocaleString('id-ID')}</td>
        <td class="right">${formatRpOwner(totalOmzet)}</td>
        <td class="right">${formatRpOwner(totalHpp)}</td>
        <td class="right">${formatRpOwner(totalProfit)} (${avgMargin}%)</td>
        <td colspan="3">Sisa Piutang: ${formatRpOwner(totalRemaining)}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer-note">
    <span>Laporan Eksekutif Owner — eganci (Mafrend.Order)</span>
    <span>Gunakan opsi "Save as PDF" / "Simpan sebagai PDF" pada dialog cetak browser.</span>
  </div>`;

  triggerPrintPDFDocument(`${reportTitle} - ${periodLabel}`, body);
}

/**
 * Exports Capex entries to a styled Owner PDF Report.
 */
export function exportCapexToPDF(capex: CapexEntry[], periodLabel = 'Semua Periode'): void {
  const safeCapex = Array.isArray(capex) ? capex : [];
  const totalAmount = safeCapex.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const rowsHtml = safeCapex
    .map(
      (c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(formatDateML(c.entryDate))}</td>
      <td class="bold">${escapeHtml(c.itemName)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td class="right bold">${formatRpOwner(c.amount)}</td>
      <td>${escapeHtml(c.description || c.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <div class="header">
    <div>
      <h1>Laporan Belanja Modal (Capex) Owner</h1>
      <p>eganci (Mafrend.Order) — Investasi Peralatan & Aset Workshop | Periode: ${escapeHtml(periodLabel)}</p>
    </div>
    <div style="text-align:right;font-size:11px;">
      <strong>Total Capex: ${formatRpOwner(totalAmount)}</strong><br/>
      ${safeCapex.length} Aset Tercatat
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th style="width:90px">Tanggal</th>
        <th>Nama Barang / Aset Modal</th>
        <th style="width:150px">Kategori</th>
        <th class="right" style="width:140px">Biaya Pembelian</th>
        <th>Keterangan / Spesifikasi</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4">TOTAL BELANJA MODAL (CAPEX)</td>
        <td class="right">${formatRpOwner(totalAmount)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="footer-note">
    <span>Laporan Belanja Modal (Capex) Owner — eganci</span>
    <span>Pilih "Save as PDF" / "Simpan sebagai PDF" untuk menyimpan berkas PDF.</span>
  </div>`;

  triggerPrintPDFDocument(`Laporan Capex Owner - ${periodLabel}`, body);
}

/**
 * Exports Recurring Raw Materials to a styled Owner PDF Report.
 */
export function exportRawMaterialsToPDF(
  materials: RawMaterialEntry[],
  periodLabel = 'Semua Periode'
): void {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const totalAmount = safeMaterials.reduce((s, m) => s + (Number(m.totalAmount) || 0), 0);

  const rowsHtml = safeMaterials
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(formatDateML(m.entryDate))}</td>
      <td class="bold">${escapeHtml(m.materialName)}</td>
      <td>${escapeHtml(m.category)}</td>
      <td>${escapeHtml(m.supplier || '-')}</td>
      <td class="right">${Number(m.qty ?? m.quantity) || 0} ${escapeHtml(m.unit)}</td>
      <td class="right">${formatRpOwner(m.unitPrice)}</td>
      <td class="right bold">${formatRpOwner(m.totalAmount)}</td>
      <td>${escapeHtml(m.notes || '-')}</td>
    </tr>`
    )
    .join('');

  const body = `
  <div class="header">
    <div>
      <h1>Laporan Bahan Baku Berulang Owner</h1>
      <p>eganci (Mafrend.Order) — Pasokan Rutin Workshop | Periode: ${escapeHtml(periodLabel)}</p>
    </div>
    <div style="text-align:right;font-size:11px;">
      <strong>Total Bahan Baku: ${formatRpOwner(totalAmount)}</strong><br/>
      ${safeMaterials.length} Nota Pembelian
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th style="width:85px">Tanggal</th>
        <th>Nama Bahan Baku</th>
        <th>Kategori</th>
        <th>Supplier / Toko</th>
        <th class="right">Volume</th>
        <th class="right">Harga Satuan</th>
        <th class="right">Total Biaya</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="7">TOTAL BELANJA BAHAN BAKU BERULANG</td>
        <td class="right">${formatRpOwner(totalAmount)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="footer-note">
    <span>Laporan Bahan Baku Berulang Owner — eganci</span>
    <span>Pilih "Save as PDF" / "Simpan sebagai PDF" untuk menyimpan berkas PDF.</span>
  </div>`;

  triggerPrintPDFDocument(`Laporan Bahan Baku Owner - ${periodLabel}`, body);
}
