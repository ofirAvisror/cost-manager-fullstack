/**
 * exportHelpers.js - Helper functions for exporting data
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/** jsPDF built-in fonts have no Hebrew glyphs — text becomes mojibake without a Unicode font. */
const HEBREW_PDF_FONT = 'NotoSansHebrew';
const HEBREW_FONT_FILE = 'NotoSansHebrew-Regular.ttf';
const HEBREW_FONT_PATH = `${process.env.PUBLIC_URL || ''}/fonts/${HEBREW_FONT_FILE}`;

let hebrewFontBase64Promise = null;

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function loadHebrewFontBase64() {
  if (!hebrewFontBase64Promise) {
    hebrewFontBase64Promise = fetch(HEBREW_FONT_PATH)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load PDF font');
        }
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  }
  return hebrewFontBase64Promise;
}

/**
 * Registers Noto Sans Hebrew on the document (required per jsPDF instance).
 * @param {import('jspdf').jsPDF} doc
 */
async function registerHebrewFont(doc) {
  const base64 = await loadHebrewFontBase64();
  doc.addFileToVFS(HEBREW_FONT_FILE, base64);
  doc.addFont(HEBREW_FONT_FILE, HEBREW_PDF_FONT, 'normal');
  doc.setFont(HEBREW_PDF_FONT, 'normal');
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
      cost.currency
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
 * Exports costs to PDF format
 * @param {Array} costs - Array of cost items
 * @param {string} [title='Costs Report'] - Report title
 * @param {string} [filename='costs-export.pdf'] - Output filename
 */
export async function exportToPDF(costs, title = 'Costs Report', filename = 'costs-export.pdf') {
  const doc = new jsPDF();

  await registerHebrewFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title (RTL-friendly alignment when title is Hebrew)
  doc.setFontSize(18);
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  doc.text(title, pageWidth - 14, 22, { align: 'right' });

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Prepare table data
  const tableData = costs.map(function(cost) {
    return [
      `${cost.date.year}-${cost.date.month}-${cost.date.day}`,
      cost.category,
      cost.description,
      cost.sum.toFixed(2),
      cost.currency
    ];
  });

  // Add table
  doc.autoTable({
    head: [['Date', 'Category', 'Description', 'Amount', 'Currency']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9, font: HEBREW_PDF_FONT, fontStyle: 'normal' },
    headStyles: { fillColor: [99, 102, 241], font: HEBREW_PDF_FONT, fontStyle: 'normal' },
  });

  // Add total
  const total = costs.reduce((sum, cost) => sum + cost.sum, 0);
  const finalY = doc.lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.setFont(HEBREW_PDF_FONT, 'normal');
  doc.text(`Total: ${total.toFixed(2)}`, 14, finalY + 10);

  // Save PDF
  doc.save(filename);
}



