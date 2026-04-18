/**
 * ReportView.jsx - Component for displaying detailed monthly reports
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
import { useHouseholdView } from '../contexts/HouseholdViewContext';
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
  const householdView = useHouseholdView();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState('ILS');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(
    function resetReportOnScopeChange() {
      setReport(null);
    },
    [householdView]
  );

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

  const getItemDay = function(item) {
    if (!item || typeof item !== 'object') return '-';
    if (item.Date && typeof item.Date === 'object' && item.Date.day !== undefined) {
      return item.Date.day;
    }
    if (item.date && typeof item.date === 'object' && item.date.day !== undefined) {
      return item.date.day;
    }
    const rawDate = item.created_at || item.createdAt || item.date;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getDate();
      }
    }
    return '-';
  };

  const getItemSum = function(item) {
    const num = Number(item?.sum);
    return Number.isFinite(num) ? num : 0;
  };

  const summaryPaperSx = {
    p: { xs: 2, sm: 2.5 },
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: 2,
    boxShadow: 2,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  };

  const summaryAmountSx = {
    fontWeight: 700,
    fontSize: { xs: '0.95rem', sm: '1.5rem' },
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    hyphens: 'auto',
  };

  return (
    <Card 
      sx={{ 
        maxWidth: { xs: '100%', md: 1200 }, 
        width: '100%',
        mx: 'auto',
        boxSizing: 'border-box',
        borderRadius: 3,
        boxShadow: 4,
        bgcolor: 'background.paper',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', minWidth: 0, overflowX: 'hidden', boxSizing: 'border-box' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '1.35rem', sm: '2rem' },
              wordBreak: 'break-word',
            }}
          >
            {t('report.title')}
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: 3, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              flexWrap: 'wrap',
              alignItems: { xs: 'stretch', sm: 'center' },
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
        <TextField
          label={t('common.year')}
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
          inputProps={{ min: 2000, max: 2100 }}
          sx={{ width: { xs: '100%', sm: 120 }, minWidth: 0, flexShrink: 0 }}
        />

        <FormControl sx={{ minWidth: 0, width: { xs: '100%', sm: 160 }, flexShrink: 0 }}>
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

        <FormControl sx={{ minWidth: 0, width: { xs: '100%', sm: 130 }, flexShrink: 0 }}>
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
                width: { xs: '100%', sm: 'auto' },
                alignSelf: { xs: 'stretch', sm: 'center' },
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
            <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                    mb: 3,
                    gap: 2,
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                  }}
                >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: { xs: '1.1rem', sm: '1.5rem' },
                    wordBreak: 'break-word',
                    minWidth: 0,
                  }}
                >
                  {t('report.reportFor', { month: monthNames[month - 1], year: year })}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    minWidth: 0,
                  }}
                >
                  <Chip 
                    label={`${report.expenses.length + report.incomes.length + report.savings.deposits.length + report.savings.withdrawals.length} ${t('common.items')}`}
                    color="primary"
                    sx={{ fontWeight: 600, maxWidth: '100%' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => setExportDialogOpen(true)}
                    size="small"
                    sx={{ flexShrink: 0 }}
                  >
                    {t('common.export')}
                  </Button>
                </Box>
              </Box>

              {/* Summary cards: CSS grid avoids MUI Grid negative margins (mobile horizontal scroll) */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 2,
                  mb: 3,
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                }}
              >
                <Paper elevation={0} sx={{ ...summaryPaperSx, bgcolor: 'error.light' }}>
                  <Typography variant="body2" sx={{ color: 'error.contrastText', mb: 0.5, opacity: 0.9, overflowWrap: 'anywhere' }}>
                    {t('report.totalExpenses')}
                  </Typography>
                  <Typography variant="h5" sx={{ ...summaryAmountSx, color: 'error.contrastText' }}>
                    {report.totals.expenses.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ ...summaryPaperSx, bgcolor: 'success.light' }}>
                  <Typography variant="body2" sx={{ color: 'success.contrastText', mb: 0.5, opacity: 0.9 }}>
                    {t('report.totalIncomes')}
                  </Typography>
                  <Typography variant="h5" sx={{ ...summaryAmountSx, color: 'success.contrastText' }}>
                    {report.totals.incomes.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ ...summaryPaperSx, bgcolor: 'info.light' }}>
                  <Typography variant="body2" sx={{ color: 'info.contrastText', mb: 0.5, opacity: 0.9, overflowWrap: 'anywhere' }}>
                    {t('report.totalSavings')}
                  </Typography>
                  <Typography variant="h5" sx={{ ...summaryAmountSx, color: 'info.contrastText' }}>
                    {report.totals.savings.toFixed(2)} {report.totals.currency}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    ...summaryPaperSx,
                    bgcolor: report.totals.balance >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'white', mb: 0.5, opacity: 0.9 }}>
                    {t('report.balance')}
                  </Typography>
                  <Typography variant="h5" sx={{ ...summaryAmountSx, color: 'white' }}>
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
                    <Box sx={{ mb: 3, minWidth: 0, maxWidth: '100%' }}>
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
                          overflowX: 'auto',
                          width: '100%',
                          maxWidth: '100%',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <Table size="small" sx={{ minWidth: { xs: 0, sm: 520 } }}>
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
                                  <Chip label={getItemDay(cost)} size="small" color="error" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>
                                  {getItemSum(cost).toFixed(2)}
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
                    <Box sx={{ mb: 3, minWidth: 0, maxWidth: '100%' }}>
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
                          overflowX: 'auto',
                          width: '100%',
                          maxWidth: '100%',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <Table size="small" sx={{ minWidth: { xs: 0, sm: 520 } }}>
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
                                  <Chip label={getItemDay(income)} size="small" color="success" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                                  {getItemSum(income).toFixed(2)}
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
                    <Box sx={{ mb: 3, minWidth: 0, maxWidth: '100%' }}>
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
                          overflowX: 'auto',
                          width: '100%',
                          maxWidth: '100%',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <Table size="small" sx={{ minWidth: { xs: 0, sm: 560 } }}>
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
                                  <Chip label={getItemDay(deposit)} size="small" color="info" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                                  {getItemSum(deposit).toFixed(2)}
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
                                  <Chip label={getItemDay(withdrawal)} size="small" color="info" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>
                                  -{getItemSum(withdrawal).toFixed(2)}
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

