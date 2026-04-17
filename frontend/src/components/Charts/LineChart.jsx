/**
 * LineChart.jsx - Line chart component for trends
 */

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * LineChart component
 * @param {Object} props - Component props
 * @param {Array} props.data - Chart data array
 * @param {string} props.currency - Currency code
 * @param {string} [props.title='Monthly Trends'] - Chart title
 */
export default function LineChart({ data, currency, title }) {
  const { t } = useTranslation();
  const chartTitle = title || t('charts.monthlyTrends');
  
  return (
    <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'background.paper' }}>
      {chartTitle && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          {chartTitle}
        </Typography>
      )}
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#64748b', fontWeight: 600 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontWeight: 600 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              formatter={(value) => `${value.toFixed(2)} ${currency}`}
              contentStyle={{ 
                borderRadius: 8,
                border: '1px solid #e0e0e0',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#6366f1" 
              strokeWidth={3}
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6 }}
              name={`Total (${currency})`}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

