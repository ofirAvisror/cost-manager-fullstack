/**
 * EditCostDialog — edit amount, category, description, date, and currency for an existing cost.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function EditCostDialog({ open, cost, db, onClose, onSaved }) {
  const { t } = useTranslation();
  const [sum, setSum] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(
    function syncFieldsFromCost() {
      if (!open || !cost) return;
      setSum(String(cost.sum ?? ''));
      setDescription(cost.description || '');
      setCategory(cost.category || '');
      setCurrency(cost.currency || 'ILS');
      const d = cost.date || {};
      setYear(String(d.year ?? ''));
      setMonth(String(d.month ?? ''));
      setDay(String(d.day ?? ''));
    },
    [open, cost]
  );

  useEffect(
    function loadCategorySuggestions() {
      if (!open || !db) return;
      (async function () {
        try {
          const cats = await db.getCategories();
          const names = cats.map(function (c) {
            return c.name;
          });
          const fromCosts = await db.getAllCosts();
          const fromCostCats = fromCosts.map(function (c) {
            return c.category;
          });
          setCategories(
            Array.from(new Set(names.concat(fromCostCats))).sort()
          );
        } catch (error) {
          setCategories([]);
        }
      })();
    },
    [open, db]
  );

  const handleSave = async function () {
    if (!db || !cost || !cost.id) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const dd = parseInt(day, 10);
    if (!description.trim() || !category.trim()) {
      toast.error(t('messages.pleaseEnterDescription'));
      return;
    }
    const s = parseFloat(sum);
    if (Number.isNaN(s) || s <= 0) {
      toast.error(t('messages.pleaseEnterAmount'));
      return;
    }
    if (
      !Number.isFinite(y) ||
      !Number.isFinite(m) ||
      !Number.isFinite(dd) ||
      m < 1 ||
      m > 12 ||
      dd < 1 ||
      dd > 31
    ) {
      toast.error(t('messages.invalidCostDate'));
      return;
    }

    try {
      await db.updateCost(cost.id, {
        description: description.trim(),
        category: category.trim(),
        sum: s,
        currency,
        date: { year: y, month: m, day: dd },
      });
      toast.success(t('messages.costUpdated'));
      if (typeof onSaved === 'function') onSaved();
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('messages.failedToSave');
      toast.error(msg);
    }
  };

  if (!cost) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('common.edit')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(cost.type === 'savings_deposit' || cost.type === 'savings_withdrawal') && (
            <Typography variant="body2" color="text.secondary">
              {t('messages.savingsEditNote')}
            </Typography>
          )}
          <TextField
            label={t('common.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label={t('common.amount')}
            type="number"
            value={sum}
            onChange={(e) => setSum(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0, step: 'any' }}
          />
          <TextField
            label={t('common.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            required
            list="edit-cost-category-suggestions"
          />
          <datalist id="edit-cost-category-suggestions">
            {categories.map(function (name) {
              return <option key={name} value={name} />;
            })}
          </datalist>
          <FormControl fullWidth>
            <InputLabel>{t('common.currency')}</InputLabel>
            <Select
              label={t('common.currency')}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <MenuItem value="ILS">ILS</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
              <MenuItem value="EURO">EURO</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label={t('common.year')}
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              sx={{ flex: '1 1 100px' }}
            />
            <TextField
              label={t('common.month')}
              type="number"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              inputProps={{ min: 1, max: 12 }}
              sx={{ flex: '1 1 80px' }}
            />
            <TextField
              label={t('common.day')}
              type="number"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              inputProps={{ min: 1, max: 31 }}
              sx={{ flex: '1 1 80px' }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
