/**
 * BarChartView.jsx - Component for displaying bar chart of monthly costs
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
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Fade
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getBarChartData } from '../lib/chartHelpers';
import { motion } from 'framer-motion';

/**
 * BarChartView component
 * Displays a bar chart showing total costs for each month in a selected year
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function BarChartView({ db }) {
  const { t } = useTranslation();
  const { mode } = useTheme();
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDayOfMonth.toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('months'); // 'months' or 'days'
  const [currency, setCurrency] = useState('USD');
  const [displayedCurrency, setDisplayedCurrency] = useState('USD'); // Currency actually used in the chart
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Fetches and displays the bar chart
   */
  const handleGetChart = async function() {
    if (!db) {
      setErrorMessage(t('messages.databaseNotInitialized'));
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setErrorMessage(t('messages.pleaseEnter') + ' valid date range');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setChartData([]);

    try {
      const data = await getBarChartData(start, end, currency, db, groupBy);
      setChartData(data);
      setDisplayedCurrency(currency); // Update displayed currency after successful fetch
    } catch (error) {
      setErrorMessage(t('messages.failedToGet') + ' chart data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

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
            📈 {t('charts.monthlyOverview')}
          </Typography>
        </Box>

        {errorMessage && (
          <Fade in={!!errorMessage}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              {errorMessage}
            </Alert>
          </Fade>
        )}

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
          label={t('charts.startDate')}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <TextField
          label={t('charts.endDate')}
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>{t('charts.groupBy')}</InputLabel>
          <Select
            value={groupBy}
            label={t('charts.groupBy')}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <MenuItem value="months">{t('charts.byMonths')}</MenuItem>
            <MenuItem value="days">{t('charts.byDays')}</MenuItem>
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
              onClick={handleGetChart}
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
              {loading ? t('common.loading') : t('charts.getChart')}
            </Button>
          </Box>
        </Paper>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        )}

        {!loading && chartData.length > 0 && (
          <Fade in={!loading && chartData.length > 0} timeout={500}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper
                elevation={0}
                sx={{ 
                  p: 4,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ width: '100%', height: 450 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? '#334155' : '#e0e0e0'} />
                      <XAxis 
                        dataKey={groupBy === 'days' ? 'day' : 'month'} 
                        tick={{ fill: mode === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 600 }}
                        axisLine={{ stroke: mode === 'dark' ? '#334155' : '#e0e0e0' }}
                        angle={groupBy === 'days' ? -45 : 0}
                        textAnchor={groupBy === 'days' ? 'end' : 'middle'}
                        height={groupBy === 'days' ? 80 : 30}
                      />
                      <YAxis 
                        tick={{ fill: mode === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 600 }}
                        axisLine={{ stroke: mode === 'dark' ? '#334155' : '#e0e0e0' }}
                      />
                      <Tooltip 
                        formatter={(value) => `${value.toFixed(2)} ${displayedCurrency}`}
                        contentStyle={{ 
                          borderRadius: 8,
                          border: `1px solid ${mode === 'dark' ? '#334155' : '#e0e0e0'}`,
                          backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                          color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
                        }}
                        labelStyle={{
                          color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20, color: mode === 'dark' ? '#f1f5f9' : '#1e293b' }}
                        formatter={(value) => <span style={{ fontWeight: 600, color: mode === 'dark' ? '#f1f5f9' : '#1e293b' }}>{value}</span>}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="url(#colorGradient)" 
                        name={`Total (${displayedCurrency})`}
                        radius={[8, 8, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </motion.div>
          </Fade>
        )}

        {!loading && chartData.length === 0 && !errorMessage && (
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
              {t('charts.clickGetChart')}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
}

