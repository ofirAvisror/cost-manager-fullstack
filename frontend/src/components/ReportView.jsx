/**
 * ReportView.jsx - Component for displaying detailed monthly reports
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Fade
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExportDialog from './Export/ExportDialog';
import toast from 'react-hot-toast';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

/**
 * ReportView component
 * Displays a detailed report for a specific month and year in a selected currency
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function ReportView({ db }) {
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState('USD');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  /**
   * Fetches and displays the report
   */
  const handleGetReport = async function() {
    if (!db) {
      toast.error(t('messages.databaseNotInitialized'));
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const result = await db.getReport(year, month, currency);
      setReport(result);
      toast.success(t('messages.reportGenerated'));
    } catch (error) {
      toast.error(t('messages.failedToGet') + ' report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'), 
    t('months.may'), t('months.june'), t('months.july'), t('months.august'), 
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

  return (
    <Card 
      sx={{ 
        maxWidth: 1200, 
        mx: 'auto', 
        borderRadius: 3,
        boxShadow: 4,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('report.title')}
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label={t('common.year')}
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
          inputProps={{ min: 2000, max: 2100 }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>{t('common.month')}</InputLabel>
          <Select
            value={month}
            label={t('common.month')}
            onChange={(e) => setMonth(e.target.value)}
          >
            {monthNames.map((name, index) => (
              <MenuItem key={index + 1} value={index + 1}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>{t('common.currency')}</InputLabel>
          <Select
            value={currency}
            label={t('common.currency')}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="ILS">ILS</MenuItem>
            <MenuItem value="GBP">GBP</MenuItem>
            <MenuItem value="EURO">EURO</MenuItem>
          </Select>
        </FormControl>

            <Button
              variant="contained"
              onClick={handleGetReport}
              disabled={!db || loading}
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
              {loading ? t('common.loading') : t('report.getReport')}
            </Button>
          </Box>
        </Paper>

        {report && (
          <Fade in={!!report} timeout={500}>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {t('report.reportFor', { month: monthNames[month - 1], year: year })}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip 
                    label={`${report.expenses.length + report.incomes.length + report.savings.deposits.length + report.savings.withdrawals.length} ${t('common.items')}`}
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => setExportDialogOpen(true)}
                    size="small"
                  >
                    {t('common.export')}
                  </Button>
                </Box>
              </Box>

              {/* Summary Cards */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Paper
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    flex: 1,
                    minWidth: 200,
                    bgcolor: 'error.light',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'error.contrastText', mb: 0.5, opacity: 0.9 }}>
                    {t('report.totalExpenses')}
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'error.contrastText', fontWeight: 700 }}>
                    {report.totals.expenses.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    flex: 1,
                    minWidth: 200,
                    bgcolor: 'success.light',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'success.contrastText', mb: 0.5, opacity: 0.9 }}>
                    {t('report.totalIncomes')}
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'success.contrastText', fontWeight: 700 }}>
                    {report.totals.incomes.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    flex: 1,
                    minWidth: 200,
                    bgcolor: 'info.light',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'info.contrastText', mb: 0.5, opacity: 0.9 }}>
                    {t('report.totalSavings')}
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'info.contrastText', fontWeight: 700 }}>
                    {report.totals.savings.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    flex: 1,
                    minWidth: 200,
                    bgcolor: report.totals.balance >= 0 ? 'success.main' : 'error.main',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'white', mb: 0.5, opacity: 0.9 }}>
                    {t('report.balance')}
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                    {report.totals.balance.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>
              </Box>

              {report.expenses.length === 0 && report.incomes.length === 0 && report.savings.deposits.length === 0 && report.savings.withdrawals.length === 0 ? (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {t('messages.noCostsFound')}
                  </Typography>
                </Paper>
              ) : (
                <>
                  {/* Expenses Table */}
                  {report.expenses.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('report.expenses')}
                      </Typography>
                      <TableContainer 
                        component={Paper}
                        elevation={0}
                        sx={{ 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'error.main' }}>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.day')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.sum')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.currency')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.category')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.description')}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {report.expenses.map((cost, index) => (
                              <TableRow 
                                key={index}
                                sx={{ 
                                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                              >
                                <TableCell>
                                  <Chip label={cost.Date.day} size="small" color="error" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>
                                  {cost.sum.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Chip label={cost.currency} size="small" />
                                </TableCell>
                                <TableCell>{cost.category}</TableCell>
                                <TableCell>{cost.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Incomes Table */}
                  {report.incomes.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('report.incomes')}
                      </Typography>
                      <TableContainer 
                        component={Paper}
                        elevation={0}
                        sx={{ 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'success.main' }}>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.day')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.sum')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.currency')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.category')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.description')}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {report.incomes.map((income, index) => (
                              <TableRow 
                                key={index}
                                sx={{ 
                                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                              >
                                <TableCell>
                                  <Chip label={income.Date.day} size="small" color="success" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                                  {income.sum.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Chip label={income.currency} size="small" />
                                </TableCell>
                                <TableCell>{income.category}</TableCell>
                                <TableCell>{income.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Savings Table */}
                  {(report.savings.deposits.length > 0 || report.savings.withdrawals.length > 0) && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('report.savings')}
                      </Typography>
                      <TableContainer 
                        component={Paper}
                        elevation={0}
                        sx={{ 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'info.main' }}>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.day')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.sum')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.currency')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.category')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>{t('common.description')}</TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {report.savings.deposits.map((deposit, index) => (
                              <TableRow 
                                key={`deposit-${index}`}
                                sx={{ 
                                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                              >
                                <TableCell>
                                  <Chip label={deposit.Date.day} size="small" color="info" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                                  {deposit.sum.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Chip label={deposit.currency} size="small" />
                                </TableCell>
                                <TableCell>{deposit.category}</TableCell>
                                <TableCell>{deposit.description}</TableCell>
                                <TableCell>
                                  <Chip label={t('forms.deposit')} size="small" color="success" />
                                </TableCell>
                              </TableRow>
                            ))}
                            {report.savings.withdrawals.map((withdrawal, index) => (
                              <TableRow 
                                key={`withdrawal-${index}`}
                                sx={{ 
                                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                              >
                                <TableCell>
                                  <Chip label={withdrawal.Date.day} size="small" color="info" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>
                                  -{withdrawal.sum.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Chip label={withdrawal.currency} size="small" />
                                </TableCell>
                                <TableCell>{withdrawal.category}</TableCell>
                                <TableCell>{withdrawal.description}</TableCell>
                                <TableCell>
                                  <Chip label={t('forms.withdrawal')} size="small" color="error" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Fade>
        )}
      </CardContent>
      
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        db={db}
      />
    </Card>
  );
}

