/**
 * AdvancedFilters.jsx - Component for advanced filtering
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import toast from 'react-hot-toast';

/**
 * AdvancedFilters component
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function AdvancedFilters({ db }) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(function() {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: 1 };
  });
  const [endDate, setEndDate] = useState(function() {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [filteredCosts, setFilteredCosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(function() {
    if (db) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const loadCategories = async function() {
    if (!db) return;
    
    try {
      const allCosts = await db.getAllCosts();
      const uniqueCategories = Array.from(new Set(allCosts.map(c => c.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      toast.error(t('messages.failedToLoad') + ' categories');
    }
  };

  const handleApplyFilters = async function() {
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    setLoading(true);
    try {
      const costs = await db.getCostsByDateRange(startDate, endDate);
      
      let filtered = costs;
      
      // Filter by categories
      if (selectedCategories.length > 0) {
        filtered = filtered.filter(c => selectedCategories.includes(c.category));
      }
      
      // Filter by amount range
      if (minAmount) {
        const min = parseFloat(minAmount);
        if (!isNaN(min)) {
          filtered = filtered.filter(c => c.sum >= min);
        }
      }
      
      if (maxAmount) {
        const max = parseFloat(maxAmount);
        if (!isNaN(max)) {
          filtered = filtered.filter(c => c.sum <= max);
        }
      }
      
      // Filter by currency
      filtered = filtered.filter(c => c.currency === currency);
      
      setFilteredCosts(filtered);
      toast.success(t('messages.foundResults', { count: filtered.length }));
    } catch (error) {
      toast.error(t('messages.failedToApply'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = function() {
    const date = new Date();
    setStartDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: 1 });
    setEndDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
    setSelectedCategories([]);
    setMinAmount('');
    setMaxAmount('');
    setCurrency('USD');
    setFilteredCosts([]);
  };

  const totalAmount = filteredCosts.reduce((sum, cost) => sum + cost.sum, 0);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        {t('filters.title')}
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'background.paper' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('common.startDate')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('common.endDate')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.category')}</InputLabel>
              <Select
                multiple
                value={selectedCategories}
                onChange={(e) => setSelectedCategories(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label={t('common.minAmount')}
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label={t('common.maxAmount')}
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.currency')}</InputLabel>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="ILS">ILS</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="EURO">EURO</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<FilterListIcon />}
                onClick={handleApplyFilters}
                disabled={loading || !db}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {t('filters.applyFilters')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleReset}
              >
                {t('common.reset')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {filteredCosts.length > 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'background.paper' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('filters.filteredResults', { count: filteredCosts.length })}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {t('filters.total', { amount: totalAmount.toFixed(2), currency: currency })}
              </Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.date')}</TableCell>
                    <TableCell>{t('common.category')}</TableCell>
                    <TableCell>{t('common.description')}</TableCell>
                    <TableCell align="right">{t('common.amount')}</TableCell>
                    <TableCell>{t('common.currency')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>
                        {cost.date.year}-{cost.date.month}-{cost.date.day}
                      </TableCell>
                      <TableCell>{cost.category}</TableCell>
                      <TableCell>{cost.description}</TableCell>
                      <TableCell align="right">{cost.sum.toFixed(2)}</TableCell>
                      <TableCell>{cost.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

