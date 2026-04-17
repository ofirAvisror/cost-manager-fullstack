/**
 * BudgetManager.jsx - Component for managing budgets
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BudgetCard from './BudgetCard';
import toast from 'react-hot-toast';

/**
 * BudgetManager component
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function BudgetManager({ db }) {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [budgetType, setBudgetType] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [spentAmounts, setSpentAmounts] = useState({});

  useEffect(function() {
    if (db) {
      loadBudgets();
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(function() {
    if (db && budgets.length > 0) {
      loadSpentAmounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, budgets]);

  const loadBudgets = async function() {
    if (!db) return;
    
    try {
      setLoading(true);
      const budgetsList = await db.getAllBudgets();
      setBudgets(budgetsList || []);
    } catch (error) {
      console.error('Failed to load budgets:', error);
      toast.error(t('messages.failedToLoad') + ' budgets: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async function() {
    if (!db) return;
    
    try {
      const allCosts = await db.getAllCosts();
      const uniqueCategories = Array.from(new Set(allCosts.map(c => c.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      // Ignore
    }
  };

  const loadSpentAmounts = async function() {
    if (!db) return;
    
    const amounts = {};
    
    for (const budget of budgets) {
      try {
        let spent = 0;
        
        if (budget.type === 'monthly' && budget.month) {
          const report = await db.getReport(budget.year, budget.month, budget.currency);
          spent = report.total.total;
        } else if (budget.type === 'yearly') {
          let total = 0;
          for (let m = 1; m <= 12; m++) {
            const report = await db.getReport(budget.year, m, budget.currency);
            total += report.total.total;
          }
          spent = total;
        } else if (budget.type === 'category' && budget.category) {
          const costs = await db.getCostsByCategory(budget.category);
          // Convert to budget currency
          const exchangeRateUrl = localStorage.getItem('exchangeRateUrl') || './exchange-rates.json';
          const rates = await fetch(exchangeRateUrl).then(r => r.json());
          spent = costs.reduce((sum, cost) => {
            const amountInUSD = cost.sum / rates[cost.currency];
            return sum + (amountInUSD * rates[budget.currency]);
          }, 0);
        }
        
        amounts[budget.id] = spent;
      } catch (error) {
        amounts[budget.id] = 0;
      }
    }
    
    setSpentAmounts(amounts);
  };

  const handleOpenDialog = function() {
    setOpenDialog(true);
    setBudgetType('monthly');
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth() + 1);
    setAmount('');
    setCurrency('USD');
    setCategory('');
  };

  const handleCloseDialog = function() {
    setOpenDialog(false);
  };

  const handleSave = async function() {
    if (!db || !amount) {
      toast.error(t('messages.pleaseEnterAmount'));
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error(t('messages.pleaseEnterValidAmount'));
      return;
    }

    try {
      const budgetData = {
        year,
        amount: amountValue,
        currency,
        type: budgetType,
        ...(budgetType === 'monthly' && { month }),
        ...(budgetType === 'category' && category && { category }),
      };

      await db.setBudget(budgetData);
      toast.success(t('messages.budgetSaved'));
      handleCloseDialog();
      loadBudgets();
    } catch (error) {
      toast.error(t('messages.failedToSave') + ' budget');
    }
  };

  if (!db) {
    return (
      <Alert severity="info">
        {t('messages.databaseNotInitialized')}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('budget.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            },
          }}
        >
          {t('budget.addBudget')}
        </Button>
      </Box>

      {budgets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper' }}>
          <AccountBalanceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('messages.noBudgetsSet')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('messages.createBudget')}
          </Typography>
          <Button variant="contained" onClick={handleOpenDialog}>
            {t('messages.createBudget')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {budgets.map((budget) => (
            <Grid item xs={12} md={6} lg={4} key={budget.id}>
              <BudgetCard 
                budget={budget} 
                spent={spentAmounts[budget.id] || 0}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Budget Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('budget.addNewBudget')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('forms.budgetType')}</InputLabel>
              <Select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value)}
              >
                <MenuItem value="monthly">{t('forms.monthly')}</MenuItem>
                <MenuItem value="yearly">{t('forms.yearly')}</MenuItem>
                <MenuItem value="category">{t('forms.byCategory')}</MenuItem>
              </Select>
            </FormControl>

            {budgetType === 'monthly' && (
              <>
                <TextField
                  label={t('common.year')}
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label={t('common.month')}
                  type="number"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 12 }}
                />
              </>
            )}

            {budgetType === 'yearly' && (
              <TextField
                label={t('common.year')}
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                fullWidth
                margin="normal"
              />
            )}

            {budgetType === 'category' && (
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('common.category')}</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={t('common.amount')}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              margin="normal"
              required
              inputProps={{ min: 0, step: 0.01 }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>{t('common.currency')}</InputLabel>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="ILS">ILS</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="EURO">EURO</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

