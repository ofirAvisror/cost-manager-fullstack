/**
 * exportHelpers.js - Helper functions for exporting data
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import bidiFactory from 'bidi-js';
import notoSansHebrewFontBase64 from './notoSansHebrewFontBase64';

/** jsPDF built-in fonts have no Hebrew glyphs — text becomes mojibake without a Unicode font. */
const HEBREW_PDF_FONT = 'NotoSansHebrew';
const HEBREW_FONT_FILE = 'NotoSansHebrew-Regular.ttf';
/** Noto Sans Hebrew subset often has no Latin digits / ISO currency codes — use built-in font for those cells. */
const LATIN_PDF_FONT = 'helvetica';

const bidi = bidiFactory();

const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/**
 * jsPDF draws glyph runs in logical LTR order; reorder for correct Hebrew / mixed text (Unicode BiDi).
 * @param {string} str
 * @returns {string}
 */
function textForPdfLtrDraw(str) {
  if (str == null || str === '') {
    return '';
  }
  const s = String(str);
  if (!HEBREW_RE.test(s)) {
    return s;
  }
  const levels = bidi.getEmbeddingLevels(s, 'auto');
  return bidi.getReorderedString(s, levels);
}

/**
 * Registers Noto Sans Hebrew on the document (required per jsPDF instance).
 * @param {import('jspdf').jsPDF} doc
 */
function registerHebrewFont(doc) {
  doc.addFileToVFS(HEBREW_FONT_FILE, notoSansHebrewFontBase64);
  doc.addFont(HEBREW_FONT_FILE, HEBREW_PDF_FONT, 'normal');
  doc.setFont(HEBREW_PDF_FONT, 'normal');
}

/**
 * PDF table is drawn LTR; for Hebrew reading order put date on the right (last column).
 */
const PDF_COLUMN_ORDER = ['category', 'description', 'amount', 'currency', 'date'];

const DEFAULT_COLUMN_LABELS = {
  date: 'Date',
  category: 'Category',
  description: 'Description',
  amount: 'Amount',
  currency: 'Currency',
};

/** Landscape A4 — keep amount/currency narrow like other data columns. */
const COL_WIDTH_MM = {
  date: 26,
  category: 36,
  description: 78,
  amount: 22,
  currency: 20,
};

/**
 * @param {string[]} selectedIds
 * @returns {string[]}
 */
function orderColumnIdsForPdf(selectedIds) {
  const set = new Set(selectedIds);
  return PDF_COLUMN_ORDER.filter(function(id) {
    return set.has(id);
  });
}

/**
 * Hebrew label (Noto) immediately followed by Latin digits (Helvetica).
 * @param {import('jspdf').jsPDF} doc
 * @param {number} xMm
 * @param {number} yMm
 * @param {string} hebrewPrefix
 * @param {string} latinSuffix
 */
function drawHebrewPrefixThenLatin(doc, xMm, yMm, hebrewPrefix, latinSuffix) {
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  const hp = textForPdfLtrDraw(hebrewPrefix);
  const wMm = doc.getTextWidth(hp);
  doc.text(hp, xMm, yMm);
  doc.setFont(LATIN_PDF_FONT, 'normal');
  doc.text(String(latinSuffix), xMm + wMm, yMm);
}

/**
 * Exports costs to CSV format
 * @param {Array} costs - Array of cost items
 * @param {string} [filename='costs-export.csv'] - Output filename
 */
export function exportToCSV(costs, filename = 'costs-export.csv') {
  const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency'];
  const rows = costs.map(function(cost) {
    return [
      `${cost.date.year}-${cost.date.month}-${cost.date.day}`,
      cost.category,
      cost.description,
      cost.sum.toString(),
      cost.currency,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(function(row) {
      return row.map(function(cell) {
        // Escape commas and quotes in cell values
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * @typedef {Object} ExportPdfOptions
 * @property {string[]} [columns] - Column ids (PDF visual order is normalized: date rightmost)
 * @property {Record<string, string>} [columnLabels] - i18n labels per column id
 * @property {{ generatedPrefix?: string, totalPrefix?: string }} [pdfStrings] - Hebrew/Latin split lines
 */

/**
 * @param {Object} cost
 * @param {string} columnId
 * @returns {string}
 */
function cellForColumn(cost, columnId) {
  switch (columnId) {
    case 'date': {
      const d = cost && cost.date;
      if (d && d.year != null && d.month != null && d.day != null) {
        return `${d.year}-${d.month}-${d.day}`;
      }
      return '';
    }
    case 'category':
      return textForPdfLtrDraw(cost.category != null ? String(cost.category) : '');
    case 'description':
      return textForPdfLtrDraw(cost.description != null ? String(cost.description) : '');
    case 'amount':
      return typeof cost.sum === 'number' ? cost.sum.toFixed(2) : String(cost.sum);
    case 'currency':
      return cost.currency != null ? String(cost.currency) : '';
    default:
      return '';
  }
}

/**
 * Exports costs to PDF format
 * @param {Array} costs - Array of cost items
 * @param {string} [title='Costs Report'] - Report title
 * @param {string} [filename='costs-export.pdf'] - Output filename
 * @param {ExportPdfOptions} [options]
 */
export async function exportToPDF(costs, title = 'Costs Report', filename = 'costs-export.pdf', options) {
  const opts = options || {};
  const rawColumnIds = Array.isArray(opts.columns) && opts.columns.length > 0
    ? opts.columns
    : PDF_COLUMN_ORDER.slice();
  const columnIds = orderColumnIdsForPdf(rawColumnIds);
  const labels = { ...DEFAULT_COLUMN_LABELS, ...(opts.columnLabels || {}) };
  const pdfStrings = opts.pdfStrings || {};
  const generatedPrefix = pdfStrings.generatedPrefix != null ? pdfStrings.generatedPrefix : 'Generated: ';
  const totalPrefix = pdfStrings.totalPrefix != null ? pdfStrings.totalPrefix : 'Total: ';

  const margin = 14;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  registerHebrewFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  doc.text(textForPdfLtrDraw(title), pageWidth - margin, 22, { align: 'right' });

  doc.setFontSize(10);
  if (/[\u0590-\u05FF]/.test(generatedPrefix)) {
    drawHebrewPrefixThenLatin(doc, margin, 30, generatedPrefix, new Date().toLocaleDateString());
  } else {
    doc.setFont(LATIN_PDF_FONT, 'normal');
    doc.text(`${generatedPrefix}${new Date().toLocaleDateString()}`, margin, 30);
  }

  const head = [columnIds.map(function(id) {
    return textForPdfLtrDraw(labels[id] || DEFAULT_COLUMN_LABELS[id] || id);
  })];

  const tableData = costs.map(function(cost) {
    return columnIds.map(function(id) {
      return cellForColumn(cost, id);
    });
  });

  const columnStyles = {};
  columnIds.forEach(function(id, index) {
    const useLatinFont = id === 'date' || id === 'amount' || id === 'currency';
    columnStyles[index] = {
      cellWidth: COL_WIDTH_MM[id] || 22,
      ...(useLatinFont ? { font: LATIN_PDF_FONT, fontStyle: 'normal' } : {}),
    };
  });

  const tableWidthMm = columnIds.reduce(function(sum, id) {
    return sum + (COL_WIDTH_MM[id] || 22);
  }, 0);

  autoTable(doc, {
    head: head,
    body: tableData,
    startY: 36,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      font: HEBREW_PDF_FONT,
      fontStyle: 'normal',
      overflow: 'linebreak',
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      font: HEBREW_PDF_FONT,
      fontStyle: 'normal',
    },
    columnStyles: columnStyles,
    tableWidth: tableWidthMm,
  });

  const total = costs.reduce(function(sum, cost) {
    const n = Number(cost && cost.sum);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const finalY = doc.lastAutoTable.finalY || 36;
  doc.setFontSize(12);
  if (/[\u0590-\u05FF]/.test(totalPrefix)) {
    drawHebrewPrefixThenLatin(doc, margin, finalY + 10, totalPrefix, total.toFixed(2));
  } else {
    doc.setFont(LATIN_PDF_FONT, 'normal');
    doc.text(`${totalPrefix}${total.toFixed(2)}`, margin, finalY + 10);
  }

  doc.save(filename);
}
