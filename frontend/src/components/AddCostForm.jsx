/**
 * AddCostForm.jsx - Component for adding new cost items
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { z } from 'zod';

/**
 * AddCostForm component
 * Allows users to add new cost items with sum, currency, category, and description
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
// Zod validation schema
const costFormSchema = z.object({
  sum: z.string()
    .min(1, 'forms.pleaseEnterValid')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'forms.positiveNumber' }),
  currency: z.enum(['USD', 'ILS', 'GBP', 'EURO'], {
    errorMap: () => ({ message: 'messages.pleaseEnterAmount' })
  }),
  category: z.string()
    .min(1, 'messages.pleaseEnterCategory')
    .trim(),
  description: z.string()
    .min(1, 'messages.pleaseEnterDescription')
    .trim(),
  transactionType: z.enum(['expense', 'income', 'savings']),
  savingsAction: z.enum(['deposit', 'withdrawal']).optional()
}).refine((data) => {
  // If transactionType is 'savings', savingsAction must be provided
  if (data.transactionType === 'savings' && !data.savingsAction) {
    return false;
  }
  return true;
}, {
  message: 'messages.pleaseEnterAmount',
  path: ['savingsAction']
});

export default function AddCostForm({ db }) {
  const { t } = useTranslation();
  const [sum, setSum] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('expense');
  const [savingsAction, setSavingsAction] = useState('deposit');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [errors, setErrors] = useState({});

  /**
   * Loads available categories from database and existing costs
   */
  useEffect(function() {
    async function loadCategories() {
      if (!db) return;

      try {
        // Get categories from categories store
        const categoriesFromStore = await db.getCategories();
        const categoryNames = categoriesFromStore.map(c => c.name);

        // Get unique categories from existing costs
        const allCosts = await db.getAllCosts();
        const costCategories = Array.from(new Set(allCosts.map(c => c.category)));

        // Combine and remove duplicates
        const allCategories = Array.from(new Set([...categoryNames, ...costCategories]));
        setAvailableCategories(allCategories.sort());
      } catch (error) {
        // If error, try to get categories from costs only
        try {
          const allCosts = await db.getAllCosts();
          const costCategories = Array.from(new Set(allCosts.map(c => c.category)));
          setAvailableCategories(costCategories.sort());
        } catch (err) {
          // Ignore errors, user can still type manually
          console.warn('Failed to load categories:', err);
        }
      }
    }

    loadCategories();
  }, [db]);

  /**
   * Handles form submission
   */
  const handleSubmit = async function(event) {
    event.preventDefault();
    
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    // Validate inputs using Zod
    const formData = {
      sum,
      currency,
      category,
      description,
      transactionType,
      ...(transactionType === 'savings' && { savingsAction })
    };

    const result = costFormSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0];
        fieldErrors[field] = t(error.message);
      });
      setErrors(fieldErrors);
      
      // Show first error as toast
      const firstError = result.error.errors[0];
      toast.error(t(firstError.message));
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    const sumValue = parseFloat(result.data.sum);

    try {
      // Determine the type based on transaction type and savings action
      let type = result.data.transactionType;
      if (result.data.transactionType === 'savings') {
        type = result.data.savingsAction === 'deposit' ? 'savings_deposit' : 'savings_withdrawal';
      }

      await db.addCost({
        sum: sumValue,
        currency: result.data.currency,
        category: result.data.category,
        description: result.data.description,
        type: type
      });

      // Reset form and show success message
      setSum('');
      setCurrency('USD');
      setCategory('');
      setDescription('');
      setTransactionType('expense');
      setSavingsAction('deposit');
      setErrors({});
      
      // Reload categories to include the new one
      try {
        const allCosts = await db.getAllCosts();
        const costCategories = Array.from(new Set(allCosts.map(c => c.category)));
        const categoriesFromStore = await db.getCategories();
        const categoryNames = categoriesFromStore.map(c => c.name);
        const allCategories = Array.from(new Set([...categoryNames, ...costCategories]));
        setAvailableCategories(allCategories.sort());
      } catch (error) {
        // Ignore errors
      }
      
      toast.success(t('messages.costItemAdded'));
    } catch (error) {
      toast.error(t('messages.failedToSave') + ' cost item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Card 
      sx={{ 
        maxWidth: 700, 
        mx: 'auto', 
        borderRadius: 3,
        boxShadow: 4,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('forms.addNewCostItem')}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Tooltip title={t('forms.tooltips.transactionType')} arrow>
            <FormControl 
              fullWidth 
              margin="normal" 
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>{t('forms.transactionType')}</InputLabel>
              <Select
                value={transactionType}
                label={t('forms.transactionType')}
                onChange={(e) => {
                  setTransactionType(e.target.value);
                  if (errors.transactionType) {
                    setErrors({ ...errors, transactionType: '' });
                  }
                }}
                error={!!errors.transactionType}
              >
                <MenuItem value="expense">{t('forms.expense')}</MenuItem>
                <MenuItem value="income">{t('forms.income')}</MenuItem>
                <MenuItem value="savings">{t('forms.savings')}</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>

          {transactionType === 'savings' && (
            <Tooltip title={t('forms.tooltips.savingsAction')} arrow>
              <FormControl 
                fullWidth 
                margin="normal" 
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <InputLabel>{t('forms.savingsAction')}</InputLabel>
                <Select
                  value={savingsAction}
                  label={t('forms.savingsAction')}
                  onChange={(e) => {
                    setSavingsAction(e.target.value);
                    if (errors.savingsAction) {
                      setErrors({ ...errors, savingsAction: '' });
                    }
                  }}
                  error={!!errors.savingsAction}
                >
                  <MenuItem value="deposit">{t('forms.deposit')}</MenuItem>
                  <MenuItem value="withdrawal">{t('forms.withdrawal')}</MenuItem>
                </Select>
              </FormControl>
            </Tooltip>
          )}

          <Tooltip title={t('forms.tooltips.sum')} arrow>
            <TextField
              label={t('common.sum')}
              type="number"
              value={sum}
              onChange={(e) => {
                setSum(e.target.value);
                if (errors.sum) {
                  setErrors({ ...errors, sum: '' });
                }
              }}
              fullWidth
              required
              margin="normal"
              placeholder={t('forms.placeholders.sum')}
              inputProps={{ min: 0, step: 0.01 }}
              error={!!errors.sum}
              helperText={errors.sum}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </Tooltip>

          <Tooltip title={t('forms.tooltips.currency')} arrow>
            <FormControl 
              fullWidth 
              margin="normal" 
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>{t('common.currency')}</InputLabel>
              <Select
                value={currency}
                label={t('common.currency')}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  if (errors.currency) {
                    setErrors({ ...errors, currency: '' });
                  }
                }}
                error={!!errors.currency}
              >
                <MenuItem value="USD">{t('currency.usd')}</MenuItem>
                <MenuItem value="ILS">{t('currency.ils')}</MenuItem>
                <MenuItem value="GBP">{t('currency.gbp')}</MenuItem>
                <MenuItem value="EURO">{t('currency.euro')}</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>

          <Tooltip title={t('forms.tooltips.category')} arrow>
            <Autocomplete
              freeSolo
              options={availableCategories}
              value={category}
              onChange={(event, newValue) => {
                setCategory(typeof newValue === 'string' ? newValue : newValue || '');
                if (errors.category) {
                  setErrors({ ...errors, category: '' });
                }
              }}
              onInputChange={(event, newInputValue) => {
                setCategory(newInputValue);
                if (errors.category) {
                  setErrors({ ...errors, category: '' });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('common.category')}
                  required
                  margin="normal"
                  placeholder={t('forms.placeholders.category')}
                  error={!!errors.category}
                  helperText={errors.category}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
              )}
            />
          </Tooltip>

          <Tooltip title={t('forms.tooltips.description')} arrow>
            <TextField
              label={t('common.description')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors({ ...errors, description: '' });
                }
              }}
              fullWidth
              required
              margin="normal"
              multiline
              rows={4}
              placeholder={t('forms.placeholders.description')}
              error={!!errors.description}
              helperText={errors.description}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </Tooltip>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ 
              mt: 3, 
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: 4,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
            disabled={!db}
          >
            {t('forms.addCostItem')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

