/**
 * ExportDialog.jsx - Dialog for exporting data
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  FormControl
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { exportToCSV, exportToPDF } from '../../lib/exportHelpers';
import toast from 'react-hot-toast';

/**
 * ExportDialog component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether dialog is open
 * @param {function} props.onClose - Function to close dialog
 * @param {Object|null} props.db - Database instance
 */
export default function ExportDialog({ open, onClose, db }) {
  const { t } = useTranslation();
  const [exportFormat, setExportFormat] = useState('csv');
  const [startDate, setStartDate] = useState(function() {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: 1 };
  });
  const [endDate, setEndDate] = useState(function() {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  });
  const [selectedColumns, setSelectedColumns] = useState(['date', 'category', 'description', 'amount', 'currency']);
  const [loading, setLoading] = useState(false);

  const columns = [
    { id: 'date', label: t('common.date') },
    { id: 'category', label: t('common.category') },
    { id: 'description', label: t('common.description') },
    { id: 'amount', label: t('common.amount') },
    { id: 'currency', label: t('common.currency') },
  ];

  const handleColumnToggle = function(columnId) {
    setSelectedColumns(function(prev) {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const handleExport = async function() {
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error(t('messages.pleaseSelectColumn'));
      return;
    }

    setLoading(true);
    try {
      const costs = await db.getCostsByDateRange(startDate, endDate);
      
      if (costs.length === 0) {
        toast.error(t('messages.noDataFound'));
        setLoading(false);
        return;
      }

      const filename = `costs-export-${startDate.year}-${startDate.month}-${startDate.day}_to_${endDate.year}-${endDate.month}-${endDate.day}`;

      if (exportFormat === 'csv') {
        exportToCSV(costs, `${filename}.csv`);
        toast.success(t('messages.dataExportedCSV'));
      } else {
        exportToPDF(costs, t('common.costManager'), `${filename}.pdf`);
        toast.success(t('messages.dataExportedPDF'));
      }

      onClose();
    } catch (error) {
      toast.error(t('messages.failedToExport'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('export.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('common.exportFormat')}
            </Typography>
            <RadioGroup
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
            </RadioGroup>
          </FormControl>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('common.dateRange')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              label={t('common.year')}
              type="number"
              value={startDate.year}
              onChange={(e) => setStartDate({ ...startDate, year: parseInt(e.target.value) || 2024 })}
              size="small"
            />
            <TextField
              label={t('common.month')}
              type="number"
              value={startDate.month}
              onChange={(e) => setStartDate({ ...startDate, month: parseInt(e.target.value) || 1 })}
              size="small"
              inputProps={{ min: 1, max: 12 }}
            />
            <TextField
              label={t('common.day')}
              type="number"
              value={startDate.day}
              onChange={(e) => setStartDate({ ...startDate, day: parseInt(e.target.value) || 1 })}
              size="small"
              inputProps={{ min: 1, max: 31 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              label={t('common.year')}
              type="number"
              value={endDate.year}
              onChange={(e) => setEndDate({ ...endDate, year: parseInt(e.target.value) || 2024 })}
              size="small"
            />
            <TextField
              label={t('common.month')}
              type="number"
              value={endDate.month}
              onChange={(e) => setEndDate({ ...endDate, month: parseInt(e.target.value) || 1 })}
              size="small"
              inputProps={{ min: 1, max: 12 }}
            />
            <TextField
              label={t('common.day')}
              type="number"
              value={endDate.day}
              onChange={(e) => setEndDate({ ...endDate, day: parseInt(e.target.value) || 1 })}
              size="small"
              inputProps={{ min: 1, max: 31 }}
            />
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('common.selectColumns')}
          </Typography>
          <FormGroup>
            {columns.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={selectedColumns.includes(column.id)}
                    onChange={() => handleColumnToggle(column.id)}
                  />
                }
                label={column.label}
              />
            ))}
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleExport} variant="contained" disabled={loading}>
          {loading ? t('export.exporting') : t('export.exportButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

