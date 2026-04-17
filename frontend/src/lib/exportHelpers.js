/**
 * exportHelpers.js - Helper functions for exporting data
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
export function exportToPDF(costs, title = 'Costs Report', filename = 'costs-export.pdf') {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
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
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  // Add total
  const total = costs.reduce((sum, cost) => sum + cost.sum, 0);
  const finalY = doc.lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${total.toFixed(2)}`, 14, finalY + 10);

  // Save PDF
  doc.save(filename);
}



