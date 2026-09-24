/**
 * EditCostDialog — edit amount, category, description, date, currency, and shared-expense payer/split.
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
  Alert,
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
  const [partnerStatus, setPartnerStatus] = useState(null);
  const [paidByTarget, setPaidByTarget] = useState('self');
  const [splitMode, setSplitMode] = useState('half_half');
  const [selfPercentage, setSelfPercentage] = useState(50);

  const hasConnectedPartner = partnerStatus?.status === 'connected' && partnerStatus?.partner;
  const myUserId = partnerStatus?.user_id ?? null;
  const partnerUserId = partnerStatus?.partner?.id ?? null;
  const partnerDisplayName = hasConnectedPartner
    ? `${partnerStatus.partner.first_name || ''} ${partnerStatus.partner.last_name || ''}`.trim() ||
      partnerStatus.partner.email ||
      t('forms.partnerOption')
    : t('forms.partnerOption');
  const isSharedCost = !!cost?.isShared;

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
      setSplitMode(cost.sharedSplitMode || 'half_half');
      const split = cost.sharedSplit || { self_percentage: 50, partner_percentage: 50 };
      setSelfPercentage(Number(split.self_percentage) || 50);
      const paidBy = cost.paidByUserId != null ? Number(cost.paidByUserId) : null;
      const partnerIdNum =
        partnerUserId != null ? Number(partnerUserId) : null;
      if (paidBy != null && partnerIdNum != null && paidBy === partnerIdNum) {
        setPaidByTarget('partner');
      } else {
        setPaidByTarget('self');
      }
    },
    [open, cost, partnerUserId]
  );

  useEffect(
    function loadPartnerStatus() {
      if (!open || !db || typeof db.getPartnerStatus !== 'function') return;
      (async function () {
        try {
          setPartnerStatus(await db.getPartnerStatus());
        } catch (error) {
          setPartnerStatus(null);
        }
      })();
    },
    [open, db]
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

    if (isSharedCost && splitMode === 'manual') {
      const partnerPct = 100 - selfPercentage;
      if (selfPercentage < 0 || selfPercentage > 100 || partnerPct < 0 || partnerPct > 100) {
        toast.error(t('messages.manualSplitRangeError'));
        return;
      }
    }

    const updatePayload = {
      description: description.trim(),
      category: category.trim(),
      sum: s,
      currency,
      date: { year: y, month: m, day: dd },
    };

    if (isSharedCost) {
      const finalPaidByUserId =
        paidByTarget === 'partner' && partnerUserId ? partnerUserId : myUserId;
      if (!finalPaidByUserId) {
        toast.error(t('messages.connectPartnerToAssign'));
        return;
      }
      updatePayload.paidByUserId = finalPaidByUserId;
      updatePayload.sharedSplitMode = splitMode;
      updatePayload.sharedSplit =
        splitMode === 'manual'
          ? { self_percentage: selfPercentage, partner_percentage: 100 - selfPercentage }
          : { self_percentage: 50, partner_percentage: 50 };
    }

    try {
      await db.updateCost(cost.id, updatePayload);
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
          {isSharedCost && (
            <>
              <Alert severity="info">{t('forms.sharedPayment')}</Alert>
              {!hasConnectedPartner && (
                <Typography variant="body2" color="text.secondary">
                  {t('messages.connectPartnerToAssign')}
                </Typography>
              )}
              <FormControl fullWidth disabled={!hasConnectedPartner}>
                <InputLabel>{t('forms.paidBy')}</InputLabel>
                <Select
                  value={paidByTarget}
                  label={t('forms.paidBy')}
                  onChange={(e) => setPaidByTarget(e.target.value)}
                >
                  <MenuItem value="self">{t('forms.meOption')}</MenuItem>
                  <MenuItem value="partner">{partnerDisplayName}</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{t('forms.splitMode')}</InputLabel>
                <Select
                  value={splitMode}
                  label={t('forms.splitMode')}
                  onChange={(e) => setSplitMode(e.target.value)}
                >
                  <MenuItem value="half_half">{t('forms.splitHalfHalf')}</MenuItem>
                  <MenuItem value="manual">{t('forms.splitManual')}</MenuItem>
                </Select>
              </FormControl>
              {splitMode === 'manual' && (
                <TextField
                  label={t('forms.mySharePercent')}
                  type="number"
                  value={selfPercentage}
                  onChange={(e) =>
                    setSelfPercentage(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  fullWidth
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText={t('forms.partnerSharePercent', { percent: 100 - selfPercentage })}
                />
              )}
            </>
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
