/**
 * CategoriesManager.jsx - Component for managing categories
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';

/**
 * CategoriesManager component
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function CategoriesManager({ db }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#6366f1');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryDetailsOpen, setCategoryDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryCosts, setCategoryCosts] = useState([]);
  const [categoryTotal, setCategoryTotal] = useState({
    USD: 0,
    ILS: 0,
    GBP: 0,
    EURO: 0
  });

  useEffect(function() {
    if (db) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const loadCategories = async function() {
    if (!db) return;
    
    try {
      setLoading(true);
      
      // Get categories from categories store
      const categoriesFromStore = await db.getCategories();
      
      // Get all unique categories from existing costs
      const allCosts = await db.getAllCosts();
      const costCategories = Array.from(new Set(allCosts.map(c => c.category)));
      
      // Create a map to combine categories from both sources
      const categoryMap = new Map();
      
      // Add categories from store (with their colors)
      categoriesFromStore.forEach(function(cat) {
        categoryMap.set(cat.name, cat);
      });
      
      // Add categories from costs (if not already in map)
      costCategories.forEach(function(catName) {
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, {
            name: catName,
            color: '#6366f1' // Default color for categories from costs
          });
        }
      });
      
      // Convert map to array and determine dominant type for each category
      const allCategories = Array.from(categoryMap.values());
      
      // For each category, determine the dominant transaction type
      for (let i = 0; i < allCategories.length; i++) {
        const category = allCategories[i];
        const categoryTransactions = allCosts.filter(function(cost) {
          return cost.category === category.name;
        });
        
        if (categoryTransactions.length > 0) {
          // Count transaction types
          let expenseCount = 0;
          let incomeCount = 0;
          let savingsCount = 0;
          
          categoryTransactions.forEach(function(transaction) {
            const type = transaction.type || 'expense';
            if (type === 'expense') {
              expenseCount++;
            } else if (type === 'income') {
              incomeCount++;
            } else if (type === 'savings_deposit' || type === 'savings_withdrawal') {
              savingsCount++;
            }
          });
          
          // Determine dominant type
          const total = expenseCount + incomeCount + savingsCount;
          if (total > 0) {
            const expenseRatio = expenseCount / total;
            const incomeRatio = incomeCount / total;
            const savingsRatio = savingsCount / total;
            
            // If one type is clearly dominant (>50%), use its color
            if (expenseRatio > 0.5) {
              category.dominantType = 'expense';
              category.typeColor = 'error.main';
            } else if (incomeRatio > 0.5) {
              category.dominantType = 'income';
              category.typeColor = 'success.main';
            } else if (savingsRatio > 0.5) {
              category.dominantType = 'savings';
              category.typeColor = 'info.main';
            } else {
              // Mixed or equal - use default color
              category.dominantType = 'mixed';
              category.typeColor = category.color || '#6366f1';
            }
          } else {
            category.dominantType = 'mixed';
            category.typeColor = category.color || '#6366f1';
          }
        } else {
          category.dominantType = 'mixed';
          category.typeColor = category.color || '#6366f1';
        }
      }
      
      // Sort by name
      allCategories.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error(t('messages.failedToLoad') + ' categories: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = function(category) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryColor(category.color || '#6366f1');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor('#6366f1');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = function() {
    setOpenDialog(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor('#6366f1');
  };

  const handleSave = async function() {
    if (!db || !categoryName.trim()) {
      toast.error(t('messages.pleaseEnterCategory'));
      return;
    }

    try {
      if (editingCategory) {
        // Check if this category exists in the store (has an id)
        if (editingCategory.id) {
          await db.updateCategory(editingCategory.id, { name: categoryName.trim(), color: categoryColor });
          toast.success(t('messages.categoryUpdated'));
        } else {
          // Category from costs, add it to store
          await db.addCategory({ name: categoryName.trim(), color: categoryColor });
          toast.success(t('messages.categoryAdded'));
        }
      } else {
        // Check if category already exists in store
        const existingCategories = await db.getCategories();
        const existing = existingCategories.find(c => c.name === categoryName.trim());
        
        if (existing) {
          // Update existing category
          await db.updateCategory(existing.id, { name: categoryName.trim(), color: categoryColor });
          toast.success(t('messages.categoryUpdated'));
        } else {
          // Add new category
          await db.addCategory({ name: categoryName.trim(), color: categoryColor });
          toast.success(t('messages.categoryAdded'));
        }
      }
      handleCloseDialog();
      loadCategories();
    } catch (error) {
      toast.error(t('messages.failedToSave') + ' category');
    }
  };

  const handleDeleteClick = function(category) {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async function() {
    if (!db || !categoryToDelete) return;

    try {
      // Only delete if category exists in store (has an id)
      if (categoryToDelete.id) {
        await db.deleteCategory(categoryToDelete.id);
        toast.success(t('messages.categoryDeleted'));
      } else {
        // Category from costs, can't delete it from store (doesn't exist there)
        toast(t('messages.thisCategoryUsed'), {
          icon: 'ℹ️',
          duration: 4000
        });
      }
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      loadCategories();
    } catch (error) {
      toast.error(t('messages.failedToDelete') + ' category');
    }
  };

  const handleCategoryClick = async function(categoryName) {
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    try {
      setSelectedCategory(categoryName);
      setCategoryDetailsOpen(true);
      
      // Load costs for this category
      const costs = await db.getCostsByCategory(categoryName);
      setCategoryCosts(costs);

      // Calculate totals by currency
      const totals = {
        USD: 0,
        ILS: 0,
        GBP: 0,
        EURO: 0
      };

      costs.forEach(function(cost) {
        totals[cost.currency] += cost.sum;
      });

      setCategoryTotal(totals);
    } catch (error) {
      toast.error(t('messages.failedToLoad') + ' category details');
      console.error(error);
    }
  };

  const handleCloseCategoryDetails = function() {
    setCategoryDetailsOpen(false);
    setSelectedCategory('');
    setCategoryCosts([]);
    setCategoryTotal({
      USD: 0,
      ILS: 0,
      GBP: 0,
      EURO: 0
    });
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
          {t('categories.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            },
          }}
        >
          {t('categories.addCategory')}
        </Button>
      </Box>

      {categories.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper' }}>
          <Typography variant="body1" color="text.secondary">
            {t('messages.noCategoriesYet')}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category.id || category.name}>
              <Card 
                sx={{ 
                  borderRadius: 3, 
                  boxShadow: 2, 
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleCategoryClick(category.name)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: category.typeColor || category.color || '#6366f1',
                        }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {category.name}
                      </Typography>
                    </Box>
                    <Box onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(category)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? t('categories.editCategory') : t('categories.addNewCategory')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label={t('forms.categoryName')}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label={t('forms.color')}
              type="color"
              value={categoryColor}
              onChange={(e) => setCategoryColor(e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {editingCategory ? t('common.update') : t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('categories.deleteCategory')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('messages.areYouSure', { name: categoryToDelete?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Details Dialog */}
      <Dialog 
        open={categoryDetailsOpen} 
        onClose={handleCloseCategoryDetails} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('categories.categoryExpenses', { category: selectedCategory })}
            </Typography>
            <IconButton onClick={handleCloseCategoryDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {categoryCosts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {t('messages.noExpensesFound')}
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Totals by Currency */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {t('common.totalByCurrency')}
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(categoryTotal).map(([currency, total]) => {
                    if (total > 0) {
                      return (
                        <Grid item xs={6} sm={3} key={currency}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              textAlign: 'center',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {currency}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {total.toFixed(2)}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    }
                    return null;
                  })}
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Expenses List */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('common.allExpenses')} ({categoryCosts.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{t('common.date')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('common.description')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{t('common.amount')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('common.currency')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell>
                          {cost.date.year}-{cost.date.month.toString().padStart(2, '0')}-{cost.date.day.toString().padStart(2, '0')}
                        </TableCell>
                        <TableCell>{cost.description}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {cost.sum.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Chip label={cost.currency} size="small" color="primary" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDetails}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

