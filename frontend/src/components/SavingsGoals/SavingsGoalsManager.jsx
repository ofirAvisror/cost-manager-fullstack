/**
 * SavingsGoalsManager.jsx - Component for managing savings goals
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SavingsIcon from '@mui/icons-material/Savings';
import toast from 'react-hot-toast';

/**
 * SavingsGoalsManager component
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function SavingsGoalsManager({ db }) {
  const { t } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  const loadGoals = async function() {
    if (!db) return;
    
    try {
      setLoading(true);
      const goalsData = await db.getSavingsGoals();
      
      // Calculate progress for each goal
      const goalsWithProgress = await Promise.all(
        goalsData.map(async function(goal) {
          const allSavings = await db.getAllCosts();
          const savingsForGoal = allSavings.filter(function(item) {
            return item.type === 'savings_deposit' || item.type === 'savings_withdrawal';
          });
          
          // Calculate total savings in goal currency
          const exchangeRateUrl =
            localStorage.getItem("exchangeRateUrl") ||
            process.env.REACT_APP_EXCHANGE_RATE_URL ||
            "https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json";
          
          try {
            const ratesResponse = await fetch(exchangeRateUrl);
            const rates = await ratesResponse.json();
            
            let totalSavings = 0;
            savingsForGoal.forEach(function(item) {
              const amountInUSD = item.sum / rates[item.currency];
              const convertedAmount = amountInUSD * rates[goal.currency];
              if (item.type === 'savings_deposit') {
                totalSavings += convertedAmount;
              } else {
                totalSavings -= convertedAmount;
              }
            });
            
            const progress = Math.min((totalSavings / goal.targetAmount) * 100, 100);
            
            return {
              ...goal,
              currentAmount: totalSavings,
              progress: progress
            };
          } catch (error) {
            console.warn('Failed to calculate progress:', error);
            return {
              ...goal,
              currentAmount: 0,
              progress: 0
            };
          }
        })
      );
      
      setGoals(goalsWithProgress);
    } catch (error) {
      toast.error(t('messages.failedToLoad') + ' savings goals: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(function() {
    if (db) {
      loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const handleOpenDialog = function(goal) {
    if (goal) {
      setEditingGoal(goal);
      setGoalName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      const date = new Date(goal.targetDate.year, goal.targetDate.month - 1, goal.targetDate.day);
      setTargetDate(date.toISOString().split('T')[0]);
      setCurrency(goal.currency);
    } else {
      setEditingGoal(null);
      setGoalName('');
      setTargetAmount('');
      setTargetDate('');
      setCurrency('USD');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = function() {
    setOpenDialog(false);
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setCurrency('USD');
  };

  const handleSave = async function() {
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    if (!goalName.trim()) {
      toast.error(t('messages.pleaseEnterCategory'));
      return;
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      toast.error(t('messages.pleaseEnterValidAmount'));
      return;
    }

    if (!targetDate) {
      toast.error(t('messages.pleaseEnter') + ' ' + t('forms.targetDate'));
      return;
    }

    try {
      const date = new Date(targetDate);
      const goalData = {
        name: goalName.trim(),
        targetAmount: parseFloat(targetAmount),
        currency: currency,
        targetDate: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        }
      };

      if (editingGoal) {
        await db.updateSavingsGoal(editingGoal.id, goalData);
        toast.success(t('savingsGoals.goalUpdated'));
      } else {
        await db.addSavingsGoal(goalData);
        toast.success(t('savingsGoals.goalAdded'));
      }

      handleCloseDialog();
      loadGoals();
    } catch (error) {
      toast.error(t('messages.failedToSave') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteClick = function(goal) {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async function() {
    if (!db || !goalToDelete) return;

    try {
      await db.deleteSavingsGoal(goalToDelete.id);
      toast.success(t('savingsGoals.goalDeleted'));
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
      loadGoals();
    } catch (error) {
      toast.error(t('messages.failedToDelete') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!db) {
    return (
      <Alert severity="info">
        {t('messages.databaseNotInitializedWait')}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('savingsGoals.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null)}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: 4,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {t('savingsGoals.addGoal')}
        </Button>
      </Box>

      {goals.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <SavingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {t('savingsGoals.noGoalsYet')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog(null)}
            sx={{ mt: 2 }}
          >
            {t('savingsGoals.addGoal')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {goals.map(function(goal) {
            const progressPercentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            
            return (
              <Grid item xs={12} md={6} lg={4} key={goal.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    boxShadow: 2,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      boxShadow: 4,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                        {goal.name}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(goal)}
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(goal)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('savingsGoals.currentProgress')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t('savingsGoals.progress', {
                            current: goal.currentAmount.toFixed(2),
                            target: goal.targetAmount.toFixed(2),
                            currency: goal.currency
                          })}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPercentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: isCompleted ? 'success.main' : 'primary.main',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('savingsGoals.percentage', { percentage: progressPercentage.toFixed(1) })}
                        </Typography>
                        {isCompleted && (
                          <Chip
                            label={t('common.success')}
                            size="small"
                            color="success"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('forms.targetDate')}: {new Date(goal.targetDate.year, goal.targetDate.month - 1, goal.targetDate.day).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editingGoal ? t('savingsGoals.editGoal') : t('savingsGoals.addNewGoal')}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label={t('savingsGoals.goalName')}
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              fullWidth
              required
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <TextField
              label={t('savingsGoals.targetAmount')}
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              fullWidth
              required
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

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
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="USD">{t('currency.usd')}</MenuItem>
                <MenuItem value="ILS">{t('currency.ils')}</MenuItem>
                <MenuItem value="GBP">{t('currency.gbp')}</MenuItem>
                <MenuItem value="EURO">{t('currency.euro')}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={t('forms.targetDate')}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              fullWidth
              required
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
            }}
          >
            {editingGoal ? t('common.update') : t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('savingsGoals.deleteGoal')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('savingsGoals.areYouSureDelete', { name: goalToDelete?.name || '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

