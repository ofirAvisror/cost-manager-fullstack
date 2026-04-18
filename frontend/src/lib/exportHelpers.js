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
 * Build a function cost.userId -> display name from partner status + logged-in user (auth payload).
 * @param {object|null} partnerStatus - from GET /api/partners/status
 * @param {object|null} authUser - from login/register response `user`
 * @returns {(userId: number|string|null|undefined) => string}
 */
export function makeResolveOwner(partnerStatus, authUser) {
  const map = Object.create(null);
  function put(id, label) {
    if (id == null || label == null) return;
    map[String(id)] = String(label);
  }
  if (authUser && authUser.id != null) {
    const n = `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim();
    put(authUser.id, n || authUser.email || String(authUser.id));
  }
  if (partnerStatus && partnerStatus.status === 'connected' && partnerStatus.partner) {
    const p = partnerStatus.partner;
    const n = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    put(p.id, n || p.email || String(p.id));
  }
  return function resolveOwner(userId) {
    if (userId == null) return '—';
    const k = String(userId);
    return map[k] || `#${userId}`;
  };
}

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
  /** Pure / Hebrew-primary runs: 'auto' can scramble labels (e.g. category titles). */
  const hasAsciiAlnum = /[0-9A-Za-z]/.test(s);
  const baseDir = !hasAsciiAlnum ? 'rtl' : 'auto';
  const levels = bidi.getEmbeddingLevels(s, baseDir);
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
 * PDF body columns (LTR). Hebrew readers see date on the right (last column).
 * Category is not a column — each category is a grouped section title.
 */
const PDF_COLUMN_ORDER = ['description', 'owner', 'amount', 'currency', 'date'];

const DEFAULT_COLUMN_LABELS = {
  date: 'Date',
  category: 'Category',
  description: 'Description',
  amount: 'Amount',
  currency: 'Currency',
  owner: 'Owner',
};

const COL_WIDTH_MM = {
  date: 21,
  description: 44,
  owner: 30,
  amount: 9,
  currency: 10,
};

/**
 * @param {string[]} selectedIds
 * @returns {string[]}
 */
function orderColumnIdsForPdf(selectedIds) {
  const set = new Set(selectedIds);
  return PDF_COLUMN_ORDER.filter(function(id) {
    if (id === 'owner') {
      return true;
    }
    return set.has(id);
  });
}

/**
 * @param {object} cost
 * @returns {number|string|null|undefined}
 */
function ownerIdForCost(cost) {
  if (!cost) return null;
  if (cost.ownerUserId != null) return cost.ownerUserId;
  if (cost.paidByUserId != null) return cost.paidByUserId;
  return null;
}

/**
 * @param {object[]} costs
 * @returns {Array<[string, object[]]>}
 */
function groupCostsByCategory(costs) {
  const map = new Map();
  for (let i = 0; i < costs.length; i++) {
    const cost = costs[i];
    const raw = cost && cost.category;
    const key = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(cost);
  }
  const entries = Array.from(map.entries());
  entries.sort(function(a, b) {
    const ka = a[0] || '\u0000';
    const kb = b[0] || '\u0000';
    return ka.localeCompare(kb, 'he', { sensitivity: 'base' });
  });
  for (let j = 0; j < entries.length; j++) {
    const row = entries[j][1];
    row.sort(function(c1, c2) {
      const d1 = c1 && c1.date;
      const d2 = c2 && c2.date;
      if (!d1 || !d2) return 0;
      const t1 = new Date(d1.year, d1.month - 1, d1.day).getTime();
      const t2 = new Date(d2.year, d2.month - 1, d2.day).getTime();
      return t1 - t2;
    });
  }
  return entries;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} yMm top of band
 * @param {number} marginX
 * @param {number} widthMm
 * @param {number} pageWidth
 * @param {string} title
 * @returns {number} next Y below band + gap
 */
function drawPdfCategoryBand(doc, yMm, marginX, widthMm, pageWidth, title) {
  const bandH = 8;
  doc.setFillColor(237, 233, 254);
  doc.rect(marginX, yMm, widthMm, bandH, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.setLineWidth(0.15);
  doc.rect(marginX, yMm, widthMm, bandH, 'S');
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(67, 56, 202);
  doc.text(textForPdfLtrDraw(title), pageWidth - marginX - 2, yMm + 5.4, { align: 'right' });
  doc.setTextColor(30);
  return yMm + bandH + 4;
}

/**
 * Total line: Latin amount flush to right edge; Hebrew prefix immediately to its left (reliable in Noto+Helvetica mix).
 */
function drawHebrewPrefixThenLatinRight(doc, rightXMm, yMm, hebrewPrefix, latinSuffix) {
  const num = String(latinSuffix);
  doc.setFont(LATIN_PDF_FONT, 'normal');
  doc.text(num, rightXMm, yMm, { align: 'right' });
  const numW = doc.getTextWidth(num);
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  const hp = textForPdfLtrDraw(hebrewPrefix);
  doc.text(hp, rightXMm - numW - 1.2, yMm, { align: 'right' });
}

/**
 * Hebrew label (Noto) immediately followed by Latin digits (Helvetica), left-anchored block.
 */
function drawHebrewPrefixThenLatin(doc, xMm, yMm, hebrewPrefix, latinSuffix) {
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  const hp = textForPdfLtrDraw(hebrewPrefix);
  doc.text(hp, xMm, yMm);
  let wMm = doc.getTextWidth(hp);
  if (!Number.isFinite(wMm) || wMm < 0.3) {
    const fs = doc.getFontSize() || 10;
    wMm = Math.max(hp.length * fs * 0.22, 6);
  }
  doc.setFont(LATIN_PDF_FONT, 'normal');
  doc.text(String(latinSuffix), xMm + wMm, yMm);
}

/**
 * @param {object} cost
 * @param {string} columnId
 * @param {(id: number|string|null|undefined) => string} resolveOwner
 * @param {string} [sharedOwnerLabel] - shown in owner column when cost.isShared (e.g. "זוגי")
 * @returns {string}
 */
function cellForColumn(cost, columnId, resolveOwner, sharedOwnerLabel) {
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
    case 'owner':
      if (cost && cost.isShared && sharedOwnerLabel) {
        return textForPdfLtrDraw(sharedOwnerLabel);
      }
      return textForPdfLtrDraw(resolveOwner(ownerIdForCost(cost)));
    default:
      return '';
  }
}

/**
 * @param {object} cost
 * @param {string} columnId
 * @param {(id: number|string|null|undefined) => string} resolveOwner
 * @param {string} [sharedOwnerLabel]
 * @returns {string}
 */
function csvCellForColumn(cost, columnId, resolveOwner, sharedOwnerLabel) {
  switch (columnId) {
    case 'date': {
      const d = cost && cost.date;
      if (d && d.year != null && d.month != null && d.day != null) {
        return `${d.year}-${d.month}-${d.day}`;
      }
      return '';
    }
    case 'category':
      return cost.category != null ? String(cost.category) : '';
    case 'description':
      return cost.description != null ? String(cost.description) : '';
    case 'amount':
      return typeof cost.sum === 'number' ? String(cost.sum) : String(cost.sum);
    case 'currency':
      return cost.currency != null ? String(cost.currency) : '';
    case 'owner':
      if (cost && cost.isShared && sharedOwnerLabel) {
        return sharedOwnerLabel;
      }
      return resolveOwner(ownerIdForCost(cost));
    default:
      return '';
  }
}

/**
 * @typedef {Object} ExportCsvOptions
 * @property {string[]} [columns]
 * @property {Record<string, string>} [columnLabels]
 * @property {(id: number|string|null|undefined) => string} [resolveOwner]
 * @property {string} [sharedOwnerLabel] - label for shared (couple) expenses in owner column
 */

/**
 * Exports costs to CSV format
 * @param {Array} costs - Array of cost items
 * @param {string} [filename='costs-export.csv'] - Output filename
 * @param {ExportCsvOptions} [options]
 */
export function exportToCSV(costs, filename = 'costs-export.csv', options) {
  const opts = options || {};
  const rawIds =
    Array.isArray(opts.columns) && opts.columns.length > 0
      ? opts.columns
      : ['date', 'category', 'description', 'amount', 'currency'];
  const labels = opts.columnLabels || {};
  const resolveOwner =
    typeof opts.resolveOwner === 'function' ? opts.resolveOwner : function() { return ''; };
  const sharedOwnerLabel = opts.sharedOwnerLabel != null ? String(opts.sharedOwnerLabel) : '';

  const headers = rawIds.map(function(id) {
    return labels[id] || DEFAULT_COLUMN_LABELS[id] || id;
  });
  const rows = costs.map(function(cost) {
    return rawIds.map(function(id) {
      return csvCellForColumn(cost, id, resolveOwner, sharedOwnerLabel);
    });
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(function(row) {
      return row
        .map(function(cell) {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',');
    }),
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
 * @property {string[]} [columns] - Column ids (PDF groups by category; category is section title only)
 * @property {Record<string, string>} [columnLabels] - i18n labels per column id
 * @property {{ generatedPrefix?: string, totalPrefix?: string, uncategorizedLabel?: string }} [pdfStrings]
 * @property {(id: number|string|null|undefined) => string} [resolveOwner] - required for owner column text
 * @property {string} [sharedOwnerLabel] - label when cost.isShared (e.g. "זוגי")
 */

/**
 * Exports costs to PDF format
 * @param {Array} costs - Array of cost items
 * @param {string} [title='Costs Report'] - Report title
 * @param {string} [filename='costs-export.pdf'] - Output filename
 * @param {ExportPdfOptions} [options]
 */
export async function exportToPDF(costs, title = 'Costs Report', filename = 'costs-export.pdf', options) {
  const opts = options || {};
  const rawColumnIds =
    Array.isArray(opts.columns) && opts.columns.length > 0
      ? opts.columns
      : PDF_COLUMN_ORDER.slice();
  const bodyColumnIds = orderColumnIdsForPdf(rawColumnIds);
  const labels = { ...DEFAULT_COLUMN_LABELS, ...(opts.columnLabels || {}) };
  const pdfStrings = opts.pdfStrings || {};
  const generatedPrefix = pdfStrings.generatedPrefix != null ? pdfStrings.generatedPrefix : 'Generated: ';
  const totalPrefix = pdfStrings.totalPrefix != null ? pdfStrings.totalPrefix : 'Total: ';
  const uncategorizedLabel =
    pdfStrings.uncategorizedLabel != null ? pdfStrings.uncategorizedLabel : '—';
  const resolveOwner =
    typeof opts.resolveOwner === 'function' ? opts.resolveOwner : function() { return '—'; };
  const sharedOwnerLabel = opts.sharedOwnerLabel != null ? String(opts.sharedOwnerLabel) : '';

  const margin = 14;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  registerHebrewFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  const tableWidthMm = bodyColumnIds.reduce(function(sum, id) {
    return sum + (COL_WIDTH_MM[id] || 16);
  }, 0);
  const tableMarginX = Math.max(margin, (pageWidth - tableWidthMm) / 2);

  doc.setFontSize(18);
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  doc.setTextColor(30);
  doc.text(textForPdfLtrDraw(title), pageWidth - margin, 22, { align: 'right' });

  doc.setFontSize(10);
  if (/[\u0590-\u05FF]/.test(generatedPrefix)) {
    drawHebrewPrefixThenLatin(doc, tableMarginX, 30, generatedPrefix, new Date().toLocaleDateString());
  } else {
    doc.setFont(LATIN_PDF_FONT, 'normal');
    doc.text(`${generatedPrefix}${new Date().toLocaleDateString()}`, tableMarginX, 30);
  }

  const head = [
    bodyColumnIds.map(function(id) {
      return textForPdfLtrDraw(labels[id] || DEFAULT_COLUMN_LABELS[id] || id);
    }),
  ];

  const columnStyles = {};
  bodyColumnIds.forEach(function(id, index) {
    columnStyles[index] = {
      cellWidth: COL_WIDTH_MM[id] || 16,
    };
  });

  const tableOptionsBase = {
    margin: { left: tableMarginX, right: tableMarginX },
    tableWidth: 'wrap',
    styles: {
      fontSize: 9,
      font: HEBREW_PDF_FONT,
      fontStyle: 'normal',
      overflow: 'linebreak',
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [55, 48, 163],
      textColor: 255,
      font: HEBREW_PDF_FONT,
      fontStyle: 'normal',
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: columnStyles,
    didParseCell: function(data) {
      const id = bodyColumnIds[data.column.index];
      const w = id ? COL_WIDTH_MM[id] : null;
      if (typeof w === 'number') {
        data.cell.styles.cellWidth = w;
      }
      if (id === 'amount' || id === 'currency') {
        data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 1, right: 1 };
      }
      if (id === 'description' || id === 'owner') {
        data.cell.styles.halign = 'center';
      } else if (id === 'amount') {
        data.cell.styles.halign = 'right';
        data.cell.styles.overflow = 'visible';
      } else if (id === 'currency') {
        data.cell.styles.halign = 'center';
        data.cell.styles.overflow = 'visible';
      }
      if (
        data.section === 'body' &&
        (id === 'date' || id === 'amount' || id === 'currency')
      ) {
        data.cell.styles.font = LATIN_PDF_FONT;
        data.cell.styles.fontStyle = 'normal';
      }
    },
  };

  let cursorY = 38;
  const grouped = groupCostsByCategory(costs);

  for (let g = 0; g < grouped.length; g++) {
    const catKey = grouped[g][0];
    const catCosts = grouped[g][1];
    /** Raw logical Hebrew — drawPdfCategoryBand applies textForPdfLtrDraw once only (double pass reverses text). */
    const sectionTitleRaw = catKey === '' ? uncategorizedLabel : String(catKey);

    cursorY = drawPdfCategoryBand(doc, cursorY, tableMarginX, tableWidthMm, pageWidth, sectionTitleRaw);

    const tableData = catCosts.map(function(cost) {
      return bodyColumnIds.map(function(id) {
        return cellForColumn(cost, id, resolveOwner, sharedOwnerLabel);
      });
    });

    autoTable(doc, {
      ...tableOptionsBase,
      head: head,
      body: tableData,
      startY: cursorY,
    });

    cursorY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : cursorY + 20;
  }

  const total = costs.reduce(function(sum, cost) {
    const n = Number(cost && cost.sum);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  doc.setFontSize(12);
  if (/[\u0590-\u05FF]/.test(totalPrefix)) {
    drawHebrewPrefixThenLatinRight(doc, pageWidth - margin, cursorY + 4, totalPrefix, total.toFixed(2));
  } else {
    doc.setFont(LATIN_PDF_FONT, 'normal');
    const line = `${totalPrefix}${total.toFixed(2)}`;
    doc.text(line, pageWidth - margin, cursorY + 4, { align: 'right' });
  }

  doc.save(filename);
}
