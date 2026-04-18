/**
 * BudgetCard.jsx - Budget card component
 */

import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';

/**
 * BudgetCard component
 * @param {Object} props - Component props
 * @param {Object} props.budget - Budget object
 * @param {number} props.spent - Amount spent
 * @param {function(): void} [props.onDelete] - Delete handler
 */
export default function BudgetCard({ budget, spent, onDelete }) {
  const { t } = useTranslation();
  const percentage = (spent / budget.amount) * 100;
  const remaining = budget.amount - spent;
  const isOverBudget = spent > budget.amount;

  const getBudgetTypeLabel = function() {
    if (budget.type === 'monthly') {
      return t('budget.monthlyLabel', { month: budget.month, year: budget.year });
    } else if (budget.type === 'yearly') {
      return t('budget.yearlyLabel', { year: budget.year });
    } else {
      return t('budget.categoryLabel', { category: budget.category });
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%', bgcolor: 'background.paper' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {getBudgetTypeLabel()}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
              <Chip 
                label={budget.type} 
                size="small" 
                color={budget.type === 'monthly' ? 'primary' : budget.type === 'yearly' ? 'secondary' : 'default'}
              />
              {budget.spent_basis === 'couple_shared' ? (
                <Chip label={t('budget.coupleSharedShort')} size="small" color="secondary" variant="outlined" />
              ) : null}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {budget.amount.toFixed(2)} {budget.currency}
            </Typography>
            {typeof onDelete === 'function' ? (
              <Tooltip title={t('budget.deleteBudget')}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t('budget.deleteBudget')}
                  onClick={function () {
                    onDelete();
                  }}
                  sx={{ mt: -0.5 }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('budget.spent')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ fontWeight: 600, color: isOverBudget ? 'error.main' : 'text.primary' }}
            >
              {spent.toFixed(2)} {budget.currency}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(percentage, 100)} 
            color={isOverBudget ? 'error' : percentage > 80 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {percentage.toFixed(1)}% {t('budget.used')}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ fontWeight: 600, color: remaining < 0 ? 'error.main' : 'success.main' }}
            >
              {remaining >= 0 ? t('budget.remaining') + ': ' : t('budget.overBy') + ': '}
              {Math.abs(remaining).toFixed(2)} {budget.currency}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

