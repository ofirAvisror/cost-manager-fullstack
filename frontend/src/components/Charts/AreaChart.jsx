/**
 * AreaChart.jsx - Area chart component
 */

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * AreaChart component
 * @param {Object} props - Component props
 * @param {Array} props.data - Chart data array
 * @param {string} props.currency - Currency code
 * @param {string} [props.title='Monthly Overview'] - Chart title
 */
export default function AreaChart({ data, currency, title }) {
  const { t } = useTranslation();
  const chartTitle = title || t('charts.monthlyOverview');
  
  return (
    <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'background.paper' }}>
      {chartTitle && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          {chartTitle}
        </Typography>
      )}
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <RechartsAreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#6366f1" 
              fillOpacity={1}
              fill="url(#colorTotal)"
              name={`Total (${currency})`}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

