/**
 * PieChartView.jsx - Component for displaying pie chart of costs by category
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getPieChartData } from '../lib/chartHelpers';
import { motion } from 'framer-motion';

/**
 * PieChartView component
 * Displays a pie chart showing total costs by category for a specific month and year
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function PieChartView({ db }) {
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState('USD');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Colors for pie chart segments
   */
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  /**
   * Fetches and displays the pie chart
   */
  const handleGetChart = async function() {
    if (!db) {
      setErrorMessage(t('messages.databaseNotInitialized'));
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setChartData([]);

    try {
      const data = await getPieChartData(year, month, currency, db);
      setChartData(data);
    } catch (error) {
      setErrorMessage(t('messages.failedToGet') + ' chart data: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
            {t('charts.costsByCategory')}
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
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
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={140}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${value.toFixed(2)} ${currency}`}
                        contentStyle={{ borderRadius: 8 }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => <span style={{ fontWeight: 600 }}>{value}</span>}
                      />
                    </PieChart>
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

