/**
 * Dashboard.jsx - Main dashboard component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Alert,
  Skeleton
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import StatCard from './StatCard';
import toast from 'react-hot-toast';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CategoryIcon from '@mui/icons-material/Category';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Neutral colors for expenses (avoiding green for income and blue for savings)
const COLORS = ['#FF8042', '#FFBB28', '#FF7C7C', '#FFC658', '#FF6B9D', '#FF8C42', '#FFA500', '#FF6347', '#FF69B4', '#FF8C00'];

/**
 * Dashboard component
 * @param {Object} props - Component props
 * @param {Object|null} props.db - Database instance
 */
export default function Dashboard({ db }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [currency] = useState('USD');
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  useEffect(function() {
    if (!db) {
      setLoading(false);
      return;
    }

    async function loadStats() {
      if (!db) return;
      
      try {
        setLoading(true);
        setError('');
        
        // Load statistics
        const statistics = await db.getStatistics(currentYear, currentMonth, currency);
        setStats(statistics);
      } catch (err) {
        const errorMsg = t('messages.failedToLoad') + ' statistics: ' + (err instanceof Error ? err.message : 'Unknown error');
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [db, currentYear, currentMonth, currency, t]);

  if (!db) {
    return (
      <Alert severity="info">
        {t('messages.databaseNotInitializedWait')}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 4 }} />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info">
        {t('common.noData')}
      </Alert>
    );
  }

  // Prepare pie chart data
  const pieData = Object.keys(stats.totalByCategory).map(function(category) {
    return {
      name: category,
      value: stats.totalByCategory[category]
    };
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        {t('dashboard.title')}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalThisMonth')}
            value={`${stats.totalThisMonth.toFixed(2)} ${stats.currency}`}
            change={stats.changePercentage}
            icon={<AttachMoneyIcon sx={{ fontSize: 32 }} />}
            color="#ef4444"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalIncomes')}
            value={`${stats.totalIncomes.toFixed(2)} ${stats.currency}`}
            icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
            color="#10b981"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalSavings')}
            value={`${stats.totalSavings.toFixed(2)} ${stats.currency}`}
            icon={<CategoryIcon sx={{ fontSize: 32 }} />}
            color="#3b82f6"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.balance')}
            value={`${stats.balance.toFixed(2)} ${stats.currency}`}
            icon={<AttachMoneyIcon sx={{ fontSize: 32 }} />}
            color={stats.balance >= 0 ? "#10b981" : "#ef4444"}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.averageDaily')}
            value={`${stats.averageDaily.toFixed(2)} ${stats.currency}`}
            icon={<CalendarTodayIcon sx={{ fontSize: 32 }} />}
            color="#f59e0b"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.lastMonthTotal')}
            value={`${stats.totalLastMonth.toFixed(2)} ${stats.currency}`}
            icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
            color="#8b5cf6"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.categories')}
            value={Object.keys(stats.totalByCategory).length.toString()}
            icon={<CategoryIcon sx={{ fontSize: 32 }} />}
            color="#ec4899"
          />
        </Grid>
      </Grid>

      {pieData.length > 0 && (
        <Paper 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            boxShadow: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            {t('dashboard.expensesByCategory')}
          </Typography>
          <Box sx={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)} ${currency}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

