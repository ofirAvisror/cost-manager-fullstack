/**
 * StatCard.jsx - Statistics card component
 */

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * StatCard component
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} props.value - Card value
 * @param {number} [props.change] - Optional change percentage
 * @param {React.ReactNode} [props.icon] - Optional icon
 * @param {string} [props.color='#6366f1'] - Card color
 */
export default function StatCard({ title, value, change, icon, color = '#6366f1' }) {
  const { t } = useTranslation();
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        boxShadow: 2,
        bgcolor: 'background.paper',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: color }}>
              {value}
            </Typography>
          </Box>
          {icon && (
            <Box sx={{ color: color, opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>
        
        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            {isPositive ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                color: isPositive ? 'success.main' : 'error.main',
                fontWeight: 600,
              }}
            >
              {Math.abs(change).toFixed(1)}% {isPositive ? t('dashboard.increase') : t('dashboard.decrease')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

